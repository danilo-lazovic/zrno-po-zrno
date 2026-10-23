import copy

import pytest
from sqlalchemy import func, select

from modules.sadrzaj.models import Pitanje, SadrzajVerzija
from modules.sadrzaj.uvoz import NeispravanSadrzaj, objavi, proveri


def test_polaznik_dobija_kurs_bez_banke(prijavi):
    c = prijavi("ana.a")
    assert [k["kljuc"] for k in c.get("/api/kursevi").json()] == ["osnovni"]
    r = c.get("/api/sadrzaj/osnovni").json()
    assert r["verzija"] == 1
    nivoi = r["dokument"]["nivoi"]
    assert len(nivoi) == 8
    assert all("pool" not in n for n in nivoi)
    assert nivoi[0]["steps"][0]["id"] == "m1.k01"


def test_bez_prijave_nema_sadrzaja(client):
    assert client.get("/api/sadrzaj/osnovni").status_code == 401
    assert client.get("/api/kursevi").status_code == 401


def test_nepoznat_kurs(prijavi):
    assert prijavi("ana.a").get("/api/sadrzaj/nema").status_code == 404


def test_indeks_pitanja(db, dokument):
    po_mestu = dict(db.execute(select(Pitanje.gde, func.count()).group_by(Pitanje.gde)).all())
    banka = sum(len(n["pool"]) for n in dokument["nivoi"])
    brza = sum(len(n["swipe"]) for n in dokument["nivoi"])
    assert po_mestu["banka"] == banka and po_mestu["brza_runda"] == brza
    assert po_mestu["lekcija"] > 40
    za_test = banka + sum(1 for n in dokument["nivoi"] for k in n["steps"] if k["t"] in ("mc", "tf", "num"))
    assert db.scalar(select(func.count()).select_from(Pitanje).where(Pitanje.za_test.is_(True))) == za_test


def test_isti_dokument_ne_pravi_novu_verziju(db, dokument):
    objavi(db, copy.deepcopy(dokument))
    assert db.scalar(select(func.count()).select_from(SadrzajVerzija)) == 1


def test_izmena_pravi_verziju_i_cuva_istoriju_pitanja(db, dokument):
    d = copy.deepcopy(dokument)
    izbaceno = d["nivoi"][0]["pool"].pop()
    d["nivoi"][0]["steps"][2]["q"] = "Novi tekst pitanja"
    v = objavi(db, d, napomena="ispravka")
    db.commit()
    assert v.broj == 2
    assert db.scalar(select(Pitanje.aktivno).where(Pitanje.kljuc == izbaceno["id"])) is False
    assert db.scalar(select(Pitanje.tekst).where(Pitanje.kljuc == "m1.k03")) == "Novi tekst pitanja"


@pytest.mark.parametrize(
    "kvar, poruka",
    [
        (lambda d: d["nivoi"][1]["steps"][0].__setitem__("id", "m1.k01"), "ponavlja"),
        (lambda d: d["nivoi"][0]["steps"][2].__setitem__("a", 9), "van ponuđenih"),
        (lambda d: d["nivoi"][0]["steps"][0].__setitem__("t", "video"), "nepoznat tip"),
        (lambda d: d["igre"][0].__setitem__("after", "m99"), "nepoznatog nivoa"),
        (lambda d: d["igre"][0].__setitem__("implementacija", "flash"), "js ili unity"),
        (lambda d: d.pop("pojmovi"), "nedostaje"),
        (lambda d: d.pop("meni"), "kurs nema meni"),
        (lambda d: d["meni"]["pica"][0].__setitem__("solja", "kofa"), "nepoznata šolja"),
        (lambda d: d["meni"]["pica"][1]["mleko"].__setitem__("pena", "oblak"), "tanka, srednja, gusta"),
        (lambda d: d["meni"]["pica"][0]["espreso"].__setitem__("doza", [20, 18]), "kao \\[od, do\\]"),
        (lambda d: d["meni"]["pica"][0].__setitem__("after", "m99"), "nepoznatog nivoa m99"),
        (lambda d: d["meni"].__setitem__("mleka", []), "pića, šolje i vrste mleka"),
    ],
)
def test_provera_sadrzaja(dokument, kvar, poruka):
    d = copy.deepcopy(dokument)
    kvar(d)
    with pytest.raises(NeispravanSadrzaj, match=poruka):
        proveri(d)


def test_verzije_za_osoblje(prijavi, db):
    c = prijavi("trener@test.rs")
    v = c.get("/api/admin/sadrzaj/verzije").json()
    ukupno = db.scalar(select(func.count()).select_from(Pitanje))
    assert v[0]["objavljena"] and v[0]["nivoa"] == 8 and v[0]["izazova"] == ukupno
