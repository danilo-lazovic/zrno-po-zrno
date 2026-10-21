import copy

import pytest
from sqlalchemy import select

from core.config import get_settings
from core.models import AuditLog
from modules.sadrzaj.models import Pitanje
from modules.sadrzaj.uvoz import greske_sadrzaja
from tests.test_napredak import prodji

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 64


def sacuvaj(c, dok, revizija):
    return c.put("/api/admin/sadrzaj/osnovni/nacrt", json={"dokument": dok, "revizija": revizija})


def test_postojeci_sadrzaj_je_ispravan(dokument):
    assert greske_sadrzaja(dokument) == []


@pytest.mark.parametrize(
    "kvar, poruka",
    [
        (lambda d: d["nivoi"][0]["steps"][2].__setitem__("opts", ["samo jedan"]), "dva ponuđena"),
        (lambda d: d["nivoi"][0]["steps"][2].__setitem__("q", "  "), "nema pitanja"),
        (lambda d: d["nivoi"][0]["steps"][6].__setitem__("a", "da"), "tačno ili netačno"),
        (lambda d: d["nivoi"][0]["steps"][8].__setitem__("a", [20, 30]), "klizač"),
        (lambda d: d["nivoi"][0]["steps"][4].__setitem__("items", ["jedan"]), "dve stavke"),
        (lambda d: d["nivoi"][0]["steps"].clear(), "nijedan korak"),
        (lambda d: d["nivoi"][0]["swipe"][0].__setitem__("a", None), "Brzu rundu"),
        (lambda d: d["pojmovi"][0].__setitem__("opis", ""), "naziv i opis"),
        (lambda d: d["podesavanja"].__setitem__("prag", 0.3), "prag"),
        (lambda d: d["podesavanja"].__setitem__("test_pitanja", 50) or [n.__setitem__("pool", []) for n in d["nivoi"]], "u kursu ih ima"),
    ],
)
def test_provera_polja(dokument, kvar, poruka):
    d = copy.deepcopy(dokument)
    kvar(d)
    assert any(poruka in g for g in greske_sadrzaja(d)), greske_sadrzaja(d)


def test_nacrt_pre_cuvanja_je_objavljena_verzija(prijavi):
    n = prijavi("trener@test.rs").get("/api/admin/sadrzaj/osnovni/nacrt").json()
    assert (n["revizija"], n["osnova"], n["izmene"], n["greske"]) == (0, 1, [], [])
    assert {"m1", "m1.k01", "m1.b01", "m1.s01", "p.coffea"} <= set(n["zauzeti_id"])


def test_samo_admin_i_trener(prijavi):
    assert prijavi("menadzer@test.rs").get("/api/admin/sadrzaj/osnovni/nacrt").status_code == 403


def test_cuvanje_revizija_i_izmene(prijavi, dokument):
    c = prijavi("trener@test.rs")
    d = copy.deepcopy(dokument)
    d["nivoi"][0]["steps"][2]["q"] = "Novo pitanje?"
    nov = {"id": "m1.k12", "t": "tf", "q": "Kafa je biljka.", "a": True, "why": "Coffea."}
    d["nivoi"][0]["steps"].append(nov)
    obrisan = d["nivoi"][1]["pool"].pop()
    r = sacuvaj(c, d, 0)
    assert r.status_code == 200, r.text
    n = r.json()
    assert n["revizija"] == 1 and n["izmenio"] == "Trener Test"
    vrste = {(x["id"], x["vrsta"]) for x in n["izmene"]}
    assert {("m1.k03", "izmenjeno"), ("m1.k12", "dodato"), (obrisan["id"], "obrisano")} <= vrste

    # drugi urednik sa starom revizijom ne gazi izmene
    r = sacuvaj(c, dokument, 0)
    assert r.status_code == 409 and "Trener Test" in r.json()["detail"]
    assert sacuvaj(c, d, 1).json()["revizija"] == 2

    # polaznik i dalje vidi objavljenu verziju
    c.post("/api/auth/odjava")
    c = prijavi("ana.a")
    assert c.get("/api/sadrzaj/osnovni").json()["dokument"]["nivoi"][0]["steps"][2]["q"] != "Novo pitanje?"


def test_nacrt_sa_greskom_se_cuva_ali_ne_objavljuje(prijavi, dokument):
    c = prijavi("admin@test.rs")
    d = copy.deepcopy(dokument)
    d["nivoi"][0]["steps"][2]["opts"] = ["samo jedan"]
    n = sacuvaj(c, d, 0).json()
    assert any("dva ponuđena" in g for g in n["greske"])
    r = c.post("/api/admin/sadrzaj/osnovni/nacrt/objavi", json={"napomena": "probam"})
    assert r.status_code == 422 and "dva ponuđena" in r.json()["detail"]


@pytest.mark.parametrize(
    "kvar, poruka",
    [
        (lambda d: d["nivoi"].pop(), "Nivoi se ne"),
        (lambda d: d["nivoi"].reverse(), "Nivoi se ne"),
        (lambda d: d["nivoi"][0]["steps"][2].update({"t": "tf", "a": True}), "tip postojećeg"),
        (lambda d: d["kurs"].__setitem__("kljuc", "drugi"), "drugom kursu"),
    ],
)
def test_zastite(prijavi, dokument, kvar, poruka):
    d = copy.deepcopy(dokument)
    kvar(d)
    r = sacuvaj(prijavi("trener@test.rs"), d, 0)
    assert r.status_code == 422 and poruka in r.json()["detail"]


def test_objava(prijavi, dokument, db):
    c = prijavi("ana.a")
    prodji(c, dokument, "m1")
    c.post("/api/auth/odjava")

    c = prijavi("trener@test.rs")
    d = copy.deepcopy(dokument)
    d["nivoi"][0]["steps"][2]["q"] = "Odakle dolazi reč kafa?"
    d["nivoi"][0]["steps"].append({"id": "m1.k12", "t": "tf", "q": "Kafa je biljka.", "a": True})
    izbacen = d["nivoi"][1]["pool"].pop()["id"]
    sacuvaj(c, d, 0)
    assert c.post("/api/admin/sadrzaj/osnovni/nacrt/objavi", json={"napomena": "x"}).status_code == 422  # prekratka napomena
    r = c.post("/api/admin/sadrzaj/osnovni/nacrt/objavi", json={"napomena": "Jasnije pitanje o imenu"})
    assert r.status_code == 200, r.text
    assert r.json() == {"verzija": 2, "izmena": 3}

    # nacrt je potrošen, verzija objavljena, pitanja usklađena, audit upisan
    assert c.get("/api/admin/sadrzaj/osnovni/nacrt").json()["revizija"] == 0
    assert c.get("/api/admin/sadrzaj/verzije").json()[0]["broj"] == 2
    assert db.scalar(select(Pitanje.tekst).where(Pitanje.kljuc == "m1.k03")) == "Odakle dolazi reč kafa?"
    assert db.scalar(select(Pitanje.aktivno).where(Pitanje.kljuc == izbacen)) is False
    assert db.scalar(select(Pitanje.id).where(Pitanje.kljuc == "m1.k12")) is not None
    assert db.scalar(select(AuditLog.objekat).where(AuditLog.akcija == "sadrzaj_objavljen")) == "osnovni v2"
    c.post("/api/auth/odjava")

    # napredak ostaje: Ana i dalje ima završen nivo 1 i vidi novo pitanje
    c = prijavi("ana.a")
    assert c.get("/api/napredak/osnovni").json()["nivoi"]["m1"]["zavrsen"]
    assert c.get("/api/sadrzaj/osnovni").json()["verzija"] == 2


def test_objava_bez_izmena_i_bez_nacrta(prijavi, dokument):
    c = prijavi("trener@test.rs")
    assert c.post("/api/admin/sadrzaj/osnovni/nacrt/objavi", json={"napomena": "ništa"}).status_code == 404
    sacuvaj(c, copy.deepcopy(dokument), 0)
    r = c.post("/api/admin/sadrzaj/osnovni/nacrt/objavi", json={"napomena": "ništa"})
    assert r.status_code == 422 and "isti" in r.json()["detail"]


def test_odbaci(prijavi, dokument):
    c = prijavi("trener@test.rs")
    d = copy.deepcopy(dokument)
    d["pojmovi"][0]["opis"] = "Novi opis"
    sacuvaj(c, d, 0)
    assert c.delete("/api/admin/sadrzaj/osnovni/nacrt").status_code == 204
    n = c.get("/api/admin/sadrzaj/osnovni/nacrt").json()
    assert n["revizija"] == 0 and n["izmene"] == []


@pytest.fixture
def slike(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "slike_dir", tmp_path)
    return tmp_path


def test_slike(prijavi, slike):
    c = prijavi("trener@test.rs")
    r = c.post("/api/admin/sadrzaj/slike", content=PNG, headers={"content-type": "image/png"})
    assert r.status_code == 201, r.text
    url = r.json()["url"]
    assert url.startswith("/api/slike/") and url.endswith(".png")
    # ista slika dobija isti naziv
    assert c.post("/api/admin/sadrzaj/slike", content=PNG, headers={"content-type": "image/png"}).json()["url"] == url
    g = c.get(url)
    assert g.status_code == 200 and g.content == PNG and "immutable" in g.headers["cache-control"]

    assert c.post("/api/admin/sadrzaj/slike", content=PNG, headers={"content-type": "image/jpeg"}).status_code == 415
    assert c.post("/api/admin/sadrzaj/slike", content=b"<svg/>", headers={"content-type": "image/svg+xml"}).status_code == 415
    velika = JPG + b"\x00" * (5 * 1024 * 1024)
    assert c.post("/api/admin/sadrzaj/slike", content=velika, headers={"content-type": "image/jpeg"}).status_code == 413
    assert c.get("/api/slike/..%2F..%2Fetc%2Fpasswd").status_code == 404
    assert c.get("/api/slike/nema.png").status_code == 404


def test_slike_samo_urednik_otprema_a_svi_prijavljeni_vide(prijavi, client, slike):
    c = prijavi("trener@test.rs")
    url = c.post("/api/admin/sadrzaj/slike", content=JPG, headers={"content-type": "image/jpeg"}).json()["url"]
    c.post("/api/auth/odjava")
    assert client.get(url).status_code == 401
    c = prijavi("ana.a")
    assert c.get(url).status_code == 200
    assert c.post("/api/admin/sadrzaj/slike", content=JPG, headers={"content-type": "image/jpeg"}).status_code == 403


def test_premestanje_koraka_je_izmena_nivoa(prijavi, dokument):
    d = copy.deepcopy(dokument)
    koraci = d["nivoi"][0]["steps"]
    koraci[0], koraci[1] = koraci[1], koraci[0]
    n = sacuvaj(prijavi("trener@test.rs"), d, 0).json()
    assert [(x["id"], x["vrsta"]) for x in n["izmene"]] == [("m1", "izmenjeno")]


def test_obrisan_id_ostaje_zauzet(prijavi, dokument):
    c = prijavi("trener@test.rs")
    d = copy.deepcopy(dokument)
    obrisan = d["nivoi"][0]["pool"].pop()["id"]
    sacuvaj(c, d, 0)
    c.post("/api/admin/sadrzaj/osnovni/nacrt/objavi", json={"napomena": "brisanje pitanja"})
    assert obrisan in c.get("/api/admin/sadrzaj/osnovni/nacrt").json()["zauzeti_id"]
