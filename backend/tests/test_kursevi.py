import copy

from sqlalchemy import select

from core.models import Korisnik
from core.vreme import sada
from modules.sadrzaj.models import Kurs
from modules.sadrzaj.uvoz import greske_sadrzaja
from modules.test.models import Sertifikat
from modules.test.models import Test as Pokusaj


def mc(i: str) -> dict:
    return {"id": i, "t": "mc", "q": f"Pitanje {i}?", "opts": ["Da", "Ne"], "a": 0, "why": "Zato."}


def napravi(c, kljuc="probni", **dodatno):
    return c.post("/api/admin/kursevi", json={"kljuc": kljuc, "naziv": "Probni kurs", "opis": "Za probu", **dodatno})


def popuni(dok: dict, nivoa: int = 1) -> dict:
    """Kurs spreman za objavu: nivoi sa po 5 pitanja u koracima i 5 u banci (test traži 10)."""
    d = copy.deepcopy(dok)
    d["nivoi"] = []
    for n in range(1, nivoa + 1):
        m = f"m{n}"
        d["nivoi"].append({
            "id": m, "n": n, "title": f"Nivo {n}", "icon": "bean", "color": "#7B4A2D", "min": 5, "desc": "",
            "steps": [{"id": f"{m}.k00", "t": "story", "title": "Uvod", "text": "Tekst."}] + [mc(f"{m}.k{i:02}") for i in range(1, 6)],
            "pool": [mc(f"{m}.b{i:02}") for i in range(1, 6)],
            "swipe": [],
        })
    d["delovi"] = [{"naziv": "Deo 1", "nivoi": [n["id"] for n in d["nivoi"]]}]
    return d


def test_nov_kurs_je_nacrt_dok_se_ne_objavi(prijavi):
    c = prijavi("trener@test.rs")
    r = napravi(c)
    assert r.status_code == 201, r.text
    assert r.json() | {} == {"kljuc": "probni", "naziv": "Probni kurs", "opis": "Za probu", "aktivan": True, "redosled": 1,
                             "preduslov": None, "verzija": None, "nacrt": True, "nivoa": 1}
    n = c.get("/api/admin/sadrzaj/probni/nacrt").json()
    assert (n["osnova"], n["revizija"]) == (0, 1)
    assert any("nivo nema nijedan korak" in g for g in n["greske"])
    # nacrt novog kursa je jedini sadržaj
    assert c.delete("/api/admin/sadrzaj/probni/nacrt").status_code == 409
    assert [k["kljuc"] for k in c.get("/api/kursevi").json()] == ["osnovni"]


def test_nivoi_slobodni_do_objave_posle_samo_na_kraj(prijavi):
    c = prijavi("trener@test.rs")
    napravi(c)
    n = c.get("/api/admin/sadrzaj/probni/nacrt").json()
    # pre objave: dva nivoa pa obrnut redosled, sve je dozvoljeno
    d = popuni(n["dokument"], 2)
    d["nivoi"].reverse()
    assert c.put("/api/admin/sadrzaj/probni/nacrt", json={"dokument": d, "revizija": 1}).status_code == 200
    d["nivoi"].reverse()
    r = c.put("/api/admin/sadrzaj/probni/nacrt", json={"dokument": d, "revizija": 2})
    assert r.status_code == 200 and r.json()["greske"] == []
    r = c.post("/api/admin/sadrzaj/probni/nacrt/objavi", json={"napomena": "Prva verzija"})
    assert r.status_code == 200, r.text
    assert r.json()["verzija"] == 1
    assert [k["kljuc"] for k in c.get("/api/kursevi").json()] == ["osnovni", "probni"]

    # posle objave: brisanje nivoa ne, nov nivo na kraj da
    n = c.get("/api/admin/sadrzaj/probni/nacrt").json()
    bez = copy.deepcopy(n["dokument"])
    bez["nivoi"].pop()
    bez["delovi"][0]["nivoi"].pop()
    r = c.put("/api/admin/sadrzaj/probni/nacrt", json={"dokument": bez, "revizija": 0})
    assert r.status_code == 422 and "Nivoi se ne" in r.json()["detail"]
    sa = popuni(n["dokument"], 3)
    r = c.put("/api/admin/sadrzaj/probni/nacrt", json={"dokument": sa, "revizija": 0})
    assert r.status_code == 200 and ("m3", "dodato") in {(x["id"], x["vrsta"]) for x in r.json()["izmene"]}


def test_preduslov_otkljucava_kurs(prijavi, db):
    c = prijavi("trener@test.rs")
    napravi(c, preduslov="osnovni")
    d = popuni(c.get("/api/admin/sadrzaj/probni/nacrt").json()["dokument"])
    c.put("/api/admin/sadrzaj/probni/nacrt", json={"dokument": d, "revizija": 1})
    c.post("/api/admin/sadrzaj/probni/nacrt/objavi", json={"napomena": "Prva verzija"})
    c.post("/api/auth/odjava")

    c = prijavi("ana.a")
    probni = c.get("/api/kursevi").json()[1]
    assert (probni["otkljucan"], probni["preduslov"], probni["nivoa"], probni["zavrseno"]) == (False, "Osnovni nivo", 1, 0)
    r = c.post("/api/napredak/probni/nivoi/m1/prolaz")
    assert r.status_code == 403 and "Osnovni nivo" in r.json()["detail"]
    assert c.post("/api/test/probni/pokusaj").status_code == 403

    # sertifikat osnovnog kursa otključava; opozvan ga ponovo zaključava
    ana = db.scalar(select(Korisnik).where(Korisnik.korisnicko_ime == "ana.a"))
    osnovni = db.scalar(select(Kurs).where(Kurs.kljuc == "osnovni"))
    t = Pokusaj(korisnik_id=ana.id, kurs_id=osnovni.id, verzija_id=osnovni.verzija_id, pitanja=[], pocetak=sada())
    db.add(t)
    db.flush()
    s = Sertifikat(korisnik_id=ana.id, kurs_id=osnovni.id, test_id=t.id, kod="ZP-TEST-0001", procenat=90)
    db.add(s)
    db.commit()
    assert c.get("/api/kursevi").json()[1]["otkljucan"] is True
    assert c.post("/api/napredak/probni/nivoi/m1/prolaz").status_code == 201
    s.opozvan_u = sada()
    db.commit()
    assert c.get("/api/kursevi").json()[1]["otkljucan"] is False


def test_izmena_kursa_i_zastite(prijavi):
    c = prijavi("admin@test.rs")
    assert napravi(c).status_code == 201
    assert napravi(c).status_code == 409
    assert napravi(c, kljuc="Loš ključ").status_code == 422
    r = c.patch("/api/admin/kursevi/probni", json={"preduslov": "osnovni", "redosled": 5})
    assert (r.json()["preduslov"], r.json()["redosled"]) == ("osnovni", 5)
    # krug: osnovni bi tražio probni, a probni traži osnovni
    assert c.patch("/api/admin/kursevi/osnovni", json={"preduslov": "probni"}).status_code == 422
    assert c.patch("/api/admin/kursevi/probni", json={"preduslov": "probni"}).status_code == 422
    assert c.patch("/api/admin/kursevi/probni", json={"preduslov": ""}).json()["preduslov"] is None
    assert c.patch("/api/admin/kursevi/osnovni", json={"aktivan": False}).json()["aktivan"] is False
    c.post("/api/auth/odjava")

    c = prijavi("menadzer@test.rs")
    assert len(c.get("/api/admin/kursevi").json()) == 2  # menadžer vidi spisak (za statistiku), ali ne menja
    assert napravi(c, kljuc="drugi").status_code == 403
    assert c.patch("/api/admin/kursevi/probni", json={"aktivan": False}).status_code == 403


def test_delovi_moraju_pokriti_sve_nivoe(dokument):
    d = copy.deepcopy(dokument)
    d["delovi"][0]["nivoi"].remove("m1")
    assert any("m1: nivo nije ni u jednom delu" in g for g in greske_sadrzaja(d))
    d["delovi"][0]["nivoi"] += ["m2", "m9"]
    g = greske_sadrzaja(d)
    assert any("nivo m2 se ponavlja" in x for x in g) and any("nivo m9 se ponavlja ili ne postoji" in x for x in g)
