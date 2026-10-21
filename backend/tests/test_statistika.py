from datetime import timedelta

from sqlalchemy import select

from core.models import Korisnik
from core.vreme import sada
from tests.test_igre import posalji as igraj
from tests.test_napredak import izazovi, prodji
from tests.test_test import uradi


def _id(db, ime):
    return db.scalar(select(Korisnik.id).where(Korisnik.korisnicko_ime == ime))


def test_pregled_levak_i_aktivnost(prijavi, dokument):
    c = prijavi("ana.a")
    prodji(c, dokument, "m1")
    prodji(c, dokument, "m2")
    c.post("/api/auth/odjava")
    c = prijavi("bora.b")
    prodji(c, dokument, "m1")
    c.post("/api/auth/odjava")

    c = prijavi("trener@test.rs")
    p = c.get("/api/admin/statistika/pregled").json()
    assert (p["polaznika"], p["pozvanih"], p["aktivnih_danas"], p["aktivnih_7d"]) == (2, 0, 2, 2)
    levak = {x["kljuc"]: x["polaznika"] for x in p["levak"]}
    assert (levak["pin"], levak["m1"], levak["m2"], levak["m3"], levak["test"]) == (2, 2, 1, 0, 0)
    assert len(p["aktivnost"]) == 14 and p["aktivnost"][-1]["polaznika"] == 2 and p["aktivnost"][-1]["zrna"] > 0
    assert p["zapeli"] == []

    # filter po lokalu
    p = c.get("/api/admin/statistika/pregled", params={"lokal_id": 2}).json()
    assert p["polaznika"] == 1 and {x["kljuc"]: x["polaznika"] for x in p["levak"]}["m2"] == 0


def test_zapeli(prijavi, db, dokument):
    c = prijavi("ana.a")
    prodji(c, dokument, "m1")
    c.post("/api/auth/odjava")
    # Bora se prijavio pre 10 dana i od tada ništa
    bora = db.get(Korisnik, _id(db, "bora.b"))
    bora.kreiran_u = bora.poslednja_prijava = sada() - timedelta(days=10)
    db.commit()
    zapeli = prijavi("trener@test.rs").get("/api/admin/statistika/pregled").json()["zapeli"]
    assert [(z["ime"], z["nivoa"], z["dana_bez_aktivnosti"]) for z in zapeli] == [("Bora", 0, 10)]


def test_menadzer_vidi_samo_svoje(prijavi, dokument):
    c = prijavi("bora.b")
    prodji(c, dokument, "m1")
    c.post("/api/auth/odjava")
    c = prijavi("menadzer@test.rs")
    p = c.get("/api/admin/statistika/pregled").json()
    assert p["polaznika"] == 1 and p["aktivnih_danas"] == 0  # samo Ana iz Lokala A, a ona ništa nije radila
    assert [x["naziv"] for x in c.get("/api/admin/statistika/lokali").json()] == ["Lokal A"]
    assert c.get("/api/admin/statistika/pitanja", params={"min_odgovora": 1}).json() == []
    # lokal_id tuđeg lokala ne otkriva ništa
    assert c.get("/api/admin/statistika/pregled", params={"lokal_id": 2}).json()["polaznika"] == 0


def test_najteza_pitanja_i_pogresan_odgovor(prijavi, dokument):
    n1 = next(n for n in dokument["nivoi"] if n["id"] == "m1")
    mc = next(k for k in n1["steps"] if k["t"] == "mc")
    pogresan = (mc["a"] + 1) % len(mc["opts"])
    for ko in ("ana.a", "bora.b"):
        c = prijavi(ko)
        pid = c.post("/api/napredak/osnovni/nivoi/m1/prolaz").json()["prolaz_id"]
        for pit in izazovi(dokument, "m1"):
            telo = {"pitanje": pit, "rezultat": 1}
            if pit == mc["id"]:
                telo = {"pitanje": pit, "rezultat": 0, "izbor": pogresan}
            assert c.post(f"/api/napredak/prolazi/{pid}/odgovor", json=telo).status_code == 200
        c.post("/api/auth/odjava")

    c = prijavi("trener@test.rs")
    lista = c.get("/api/admin/statistika/pitanja", params={"min_odgovora": 2}).json()
    prvo = lista[0]
    assert (prvo["kljuc"], prvo["tacnost"], prvo["odgovora"]) == (mc["id"], 0, 2)
    assert (prvo["najcesci_pogresan"], prvo["pogresan_puta"]) == (mc["opts"][pogresan], 2)
    assert all(x["tacnost"] == 100 for x in lista[1:])
    assert c.get("/api/admin/statistika/pitanja", params={"min_odgovora": 3}).json() == []
    assert c.get("/api/admin/statistika/pitanja", params={"kontekst": "test", "min_odgovora": 1}).json() == []


def test_pogresan_odgovor_na_testu_se_pamti(prijavi, dokument):
    c = prijavi("ana.a")
    for n in dokument["nivoi"]:
        prodji(c, dokument, n["id"])
    uradi(c, dokument, pogresnih=20)
    c.post("/api/auth/odjava")
    lista = prijavi("trener@test.rs").get(
        "/api/admin/statistika/pitanja", params={"kontekst": "test", "min_odgovora": 1}
    ).json()
    assert len(lista) == 20 and all(x["tacnost"] < 100 for x in lista)
    assert any(x["tip"] == "mc" and x["najcesci_pogresan"] for x in lista)


def test_igre_i_lokali(prijavi, dokument):
    c = prijavi("ana.a")
    for n in dokument["nivoi"]:
        prodji(c, dokument, n["id"])
    igraj(c, "milk", 1)
    igraj(c, "milk", 0.5, izvor="unity")
    igraj(c, "dialin", 0.5, kontekst="lekcija")
    uradi(c, dokument)
    c.post("/api/auth/odjava")

    c = prijavi("admin@test.rs")
    igre = {g["igra"]: g for g in c.get("/api/admin/statistika/igre").json()}
    assert (igre["milk"]["igranja"], igre["milk"]["igraca"], igre["milk"]["prosek"], igre["milk"]["tri_zvezdice"], igre["milk"]["unity"]) == (2, 1, 75, 50, 1)
    assert igre["dialin"]["iz_lekcija"] == 1 and igre["swipe"]["igranja"] == 0

    lokali = {x["naziv"]: x for x in c.get("/api/admin/statistika/lokali").json()}
    a = lokali["Lokal A"]
    assert (a["polaznika"], a["aktivnih_7d"], a["prosek_nivoa"], a["polozili_test"], a["prosek_testa"]) == (1, 1, 8.0, 1, 100)
    assert lokali["Lokal B"]["prosek_testa"] is None and lokali["Lokal B"]["aktivnih_7d"] == 0


def test_detalj_polaznika(prijavi, db, dokument):
    c = prijavi("ana.a")
    prodji(c, dokument, "m1", {0: 0})
    igraj(c, "swipe", 0.8, 12)
    c.post("/api/auth/odjava")
    ana = _id(db, "ana.a")

    c = prijavi("menadzer@test.rs")
    d = c.get(f"/api/admin/polaznici/{ana}/detalj").json()
    assert d["ime"] == "Ana" and d["lokal"] == "Lokal A" and d["zrna"] > 0
    m1 = d["nivoi"][0]
    assert m1["zvezdice"] >= 1 and m1["prolazaka"] == 1 and m1["tacnost_odgovora"] < 100
    assert d["nivoi"][1]["zavrsen_u"] is None
    assert d["igre"] == {"swipe": 12}
    assert d["najslabija_pitanja"][0]["tacnost"] == 0
    assert {x["vrsta"] for x in d["dogadjaji"]} == {"nivo", "igra", "bedz"}
    # Bora je iz drugog lokala
    assert c.get(f"/api/admin/polaznici/{_id(db, 'bora.b')}/detalj").status_code == 404


def test_polaznik_nema_statistiku(prijavi):
    c = prijavi("ana.a")
    for put in ("pregled", "pitanja", "igre", "lokali"):
        assert c.get(f"/api/admin/statistika/{put}").status_code == 403
