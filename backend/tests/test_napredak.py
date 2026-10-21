from datetime import date, timedelta

import pytest
from sqlalchemy import func, select

from modules.napredak import bodovanje as b
from modules.napredak.models import Odgovor, Zrno
from modules.sadrzaj.uvoz import IZAZOVI


def izazovi(dokument, nivo: str) -> list[str]:
    n = next(n for n in dokument["nivoi"] if n["id"] == nivo)
    return [k["id"] for k in n["steps"] if k["t"] in IZAZOVI]


def prodji(c, dokument, nivo: str, rezultati=None):
    pid = c.post(f"/api/napredak/osnovni/nivoi/{nivo}/prolaz").json()["prolaz_id"]
    odgovori = []
    for i, pit in enumerate(izazovi(dokument, nivo)):
        r = c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": pit, "rezultat": (rezultati or {}).get(i, 1)})
        assert r.status_code == 200, r.text
        odgovori.append(r.json())
    kraj = c.post(f"/api/napredak/prolazi/{pid}/zavrsi")
    assert kraj.status_code == 200, kraj.text
    return odgovori, kraj.json()


# ---------- pravila ----------


def test_zrna_za_odgovor_i_niz():
    assert b.zrna_za_odgovor(1, 0) == (10, 1, False)
    assert b.zrna_za_odgovor(1, 1) == (10, 2, False)
    assert b.zrna_za_odgovor(1, 2) == (12, 3, False)
    assert b.zrna_za_odgovor(1, 9) == (20, 10, False)
    assert b.zrna_za_odgovor(1, 20) == (20, 21, False)
    assert b.zrna_za_odgovor(0.5, 4) == (5, 0, True)
    assert b.zrna_za_odgovor(0, 4) == (0, 0, True)


def test_zvezdice_i_bonus():
    assert [b.zvezdice_za(x) for x in (1, 0.9, 0.89, 0.7, 0.5)] == [3, 3, 2, 2, 1]
    assert b.bonus_za_nivo(0, True) == 40
    assert b.bonus_za_nivo(2, True) == 20
    assert b.bonus_za_nivo(0, False) == 20
    assert b.bonus_za_nivo(1, False) == 10


def test_dani_zaredom():
    d = date(2026, 10, 20)
    assert b.dani_zaredom([], d) == (0, 0)
    assert b.dani_zaredom([d], d) == (1, 1)
    assert b.dani_zaredom([d - timedelta(days=1)], d) == (1, 1)
    assert b.dani_zaredom([d - timedelta(days=2)], d) == (0, 1)
    dani = [d - timedelta(days=k) for k in (9, 8, 7, 6, 2, 1, 0)]
    assert b.dani_zaredom(dani, d) == (3, 4)


# ---------- API ----------


def test_prazan_napredak(prijavi):
    n = prijavi("ana.a").get("/api/napredak/osnovni").json()
    assert n == {
        "zrna": 0, "danas_zrna": 0, "niz_dana": 0, "najduzi_niz": 0, "nivoi": {}, "bedzevi": [], "kartice": {}, "igre": {},
        "test": {"najbolje": 0, "polozen": False},
    }


def test_ceo_nivo_bez_greske(prijavi, dokument, db):
    c = prijavi("ana.a")
    odgovori, kraj = prodji(c, dokument, "m1")
    broj = len(izazovi(dokument, "m1"))
    ocekivano = sum(b.zrna_za_odgovor(1, i)[0] for i in range(broj))
    assert [o["niz"] for o in odgovori] == list(range(1, broj + 1))
    assert kraj["tacnost"] == 100 and kraj["zvezdice"] == 3 and kraj["bonus"] == 40
    assert kraj["zrna_prolaz"] == ocekivano + 40
    assert set(kraj["novi_bedzevi"]) == {"first", "perfect"}
    assert "combo5" in [x for o in odgovori for x in o["novi_bedzevi"]]

    n = c.get("/api/napredak/osnovni").json()
    assert n["zrna"] == n["danas_zrna"] == ocekivano + 40
    assert n["niz_dana"] == 1
    assert n["nivoi"] == {"m1": {"zavrsen": True, "zvezdice": 3, "najbolje": 100}}
    assert set(n["bedzevi"]) == {"first", "perfect", "combo5"}
    assert db.scalar(select(func.count()).select_from(Odgovor)) == broj


def test_greske_zvezdice_i_ponavljanje(prijavi, dokument):
    c = prijavi("ana.a")
    broj = len(izazovi(dokument, "m1"))
    _, kraj = prodji(c, dokument, "m1", {0: 0, 1: 0.5})
    assert kraj["tacnost"] == round((broj - 1.5) / broj * 100)
    assert kraj["bonus"] == 20
    assert "perfect" not in kraj["novi_bedzevi"]

    _, opet = prodji(c, dokument, "m1")
    assert opet["bonus"] == 20  # pola bonusa za ponovljen nivo bez greške
    assert opet["novi_bedzevi"] == ["perfect"]
    n = c.get("/api/napredak/osnovni").json()["nivoi"]["m1"]
    assert n["zvezdice"] == 3 and n["najbolje"] == 100


def test_zakljucan_nivo(prijavi, dokument):
    c = prijavi("ana.a")
    r = c.post("/api/napredak/osnovni/nivoi/m2/prolaz")
    assert r.status_code == 403 and "nivo 1" in r.json()["detail"]
    prodji(c, dokument, "m1")
    assert c.post("/api/napredak/osnovni/nivoi/m2/prolaz").status_code == 201
    assert c.post("/api/napredak/osnovni/nivoi/m99/prolaz").status_code == 404


def test_odgovor_mora_biti_iz_nivoa_i_jednom(prijavi, dokument):
    c = prijavi("ana.a")
    pid = c.post("/api/napredak/osnovni/nivoi/m1/prolaz").json()["prolaz_id"]
    pit = izazovi(dokument, "m1")[0]
    assert c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": "m2.k02", "rezultat": 1}).status_code == 422
    assert c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": "m1.k01", "rezultat": 1}).status_code == 422  # priča
    assert c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": pit, "rezultat": 1.5}).status_code == 422
    assert c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": pit, "rezultat": 1}).status_code == 200
    assert c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": pit, "rezultat": 1}).status_code == 409
    # nedovršen nivo se ne završava, ali zrna od odgovora ostaju
    assert c.post(f"/api/napredak/prolazi/{pid}/zavrsi").status_code == 422
    assert c.get("/api/napredak/osnovni").json()["zrna"] == 10


def test_tudj_prolaz(prijavi, client, dokument):
    c = prijavi("ana.a")
    pid = c.post("/api/napredak/osnovni/nivoi/m1/prolaz").json()["prolaz_id"]
    c.post("/api/auth/odjava")
    c = prijavi("bora.b")
    pit = izazovi(dokument, "m1")[0]
    assert c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": pit, "rezultat": 1}).status_code == 404


def test_zavrsen_prolaz_se_ne_menja(prijavi, dokument):
    c = prijavi("ana.a")
    pid = c.post("/api/napredak/osnovni/nivoi/m1/prolaz").json()["prolaz_id"]
    for pit in izazovi(dokument, "m1"):
        c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": pit, "rezultat": 1})
    assert c.post(f"/api/napredak/prolazi/{pid}/zavrsi").status_code == 200
    assert c.post(f"/api/napredak/prolazi/{pid}/zavrsi").status_code == 409


def test_pola_puta_i_sve_zvezdice(prijavi, dokument):
    c = prijavi("ana.a")
    bedzevi = []
    for n in dokument["nivoi"]:
        bedzevi += prodji(c, dokument, n["id"])[1]["novi_bedzevi"]
    assert "half" in bedzevi and bedzevi[-1] == "allstars"


def test_tri_dana_zaredom(prijavi, db, dokument):
    from core.models import Korisnik
    from core.vreme import danas

    ana = db.scalar(select(Korisnik.id).where(Korisnik.korisnicko_ime == "ana.a"))
    for k in (2, 1):
        db.add(Zrno(korisnik_id=ana, kurs_id=1, iznos=5, razlog="odgovor", dan=danas() - timedelta(days=k)))
    db.commit()
    c = prijavi("ana.a")
    pid = c.post("/api/napredak/osnovni/nivoi/m1/prolaz").json()["prolaz_id"]
    r = c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": izazovi(dokument, "m1")[0], "rezultat": 1}).json()
    assert r["novi_bedzevi"] == ["streak3"]
    n = c.get("/api/napredak/osnovni").json()
    assert (n["niz_dana"], n["najduzi_niz"], n["danas_zrna"], n["zrna"]) == (3, 3, 10, 20)


def test_kartice_zrno_samo_prvi_put(prijavi, dokument):
    c = prijavi("ana.a")
    pojam = dokument["pojmovi"][0]["id"]
    assert c.post(f"/api/napredak/osnovni/kartice/{pojam}", json={"zna": True}).json()["zrna"] == 1
    assert c.post(f"/api/napredak/osnovni/kartice/{pojam}", json={"zna": False}).json()["zrna"] == 0
    assert c.post(f"/api/napredak/osnovni/kartice/{pojam}", json={"zna": True}).json()["zrna"] == 0
    n = c.get("/api/napredak/osnovni").json()
    assert n["kartice"] == {pojam: True} and n["zrna"] == 1
    assert c.post("/api/napredak/osnovni/kartice/p.nema", json={"zna": True}).status_code == 404


@pytest.mark.parametrize("avatar, kod", [("latijera", 200), ("dinosaurus", 422)])
def test_avatar(prijavi, avatar, kod):
    c = prijavi("ana.a")
    r = c.patch("/api/me", json={"avatar": avatar})
    assert r.status_code == kod
    if kod == 200:
        assert c.get("/api/me").json()["korisnik"]["avatar"] == avatar


def test_admin_vidi_napredak(prijavi, client, dokument):
    c = prijavi("ana.a")
    _, kraj = prodji(c, dokument, "m1")
    c.post("/api/auth/odjava")
    c = prijavi("menadzer@test.rs")
    ana = next(p for p in c.get("/api/admin/polaznici").json() if p["korisnicko_ime"] == "ana.a")
    assert ana["nivoa"] == 1 and ana["zrna"] == kraj["ukupno_zrna"] and ana["poslednja_aktivnost"]
