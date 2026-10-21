import random

import pytest
from sqlalchemy import select

from core.models import AuditLog, Korisnik
from modules.test.router import izvuci, normalizuj_kod, oceni, pitanja_za_test
from tests.test_napredak import prodji


def tacan(k):
    if k["t"] == "num":
        return k["a"][0]
    return k["a"]


def netacan(k):
    if k["t"] == "mc":
        return (k["a"] + 1) % len(k["opts"])
    if k["t"] == "tf":
        return not k["a"]
    return k["min"] if k["a"][0] - k["min"] > (k["max"] - k["min"]) * 0.1 else k["max"]


@pytest.fixture
def spreman(prijavi, dokument):
    """Ana sa svih 8 završenih nivoa."""
    c = prijavi("ana.a")
    for n in dokument["nivoi"]:
        prodji(c, dokument, n["id"])
    return c


def uradi(c, dokument, pogresnih=0):
    sva = pitanja_za_test(dokument)
    p = c.post("/api/test/osnovni/pokusaj")
    assert p.status_code == 201, p.text
    test = p.json()
    for i, q in enumerate(test["pitanja"]):
        k = sva[q["id"]][1]
        r = c.post(f"/api/test/pokusaji/{test['test_id']}/odgovor",
                   json={"pitanje": q["id"], "odgovor": netacan(k) if i < pogresnih else tacan(k)})
        assert r.status_code == 200, r.text
    kraj = c.post(f"/api/test/pokusaji/{test['test_id']}/zavrsi")
    assert kraj.status_code == 200, kraj.text
    return kraj.json()


# ---------- pravila ----------


def test_izvlacenje(dokument):
    sva = pitanja_za_test(dokument)
    for seme in range(20):
        izbor = izvuci(dokument, random.Random(seme))
        assert len(izbor) == dokument["podesavanja"]["test_pitanja"] == len(set(izbor))
        po_nivou = {n["id"]: 0 for n in dokument["nivoi"]}
        for pid in izbor:
            po_nivou[sva[pid][0]] += 1
        assert min(po_nivou.values()) >= 2


def test_ocenjivanje():
    mc = {"t": "mc", "opts": ["a", "b", "c"], "a": 1}
    assert (oceni(mc, 1), oceni(mc, 0), oceni(mc, True)) == (1, 0, 0)
    tf = {"t": "tf", "a": False}
    assert (oceni(tf, False), oceni(tf, True), oceni(tf, 0)) == (1, 0, 0)
    num = {"t": "num", "min": 1, "max": 12, "a": [5, 6]}
    assert (oceni(num, 5.5), oceni(num, 6.5), oceni(num, 9), oceni(num, True)) == (1, 0.5, 0, 0)


@pytest.mark.parametrize("unet", ["ZP-AB2C-DE3F", "zp-ab2c-de3f", "ZPAB2CDE3F", "ab2c de3f", " ZP AB2C-DE3F "])
def test_kod_se_cita_kako_god_ga_trener_upise(unet):
    assert normalizuj_kod(unet) == "ZP-AB2C-DE3F"


# ---------- API ----------


def test_zakljucan_dok_nivoi_nisu_gotovi(prijavi, dokument):
    c = prijavi("ana.a")
    assert c.get("/api/test/osnovni").json()["otkljucan"] is False
    r = c.post("/api/test/osnovni/pokusaj")
    assert r.status_code == 403 and "8 nivoa" in r.json()["detail"]


def test_pitanja_bez_odgovora(spreman, dokument):
    t = spreman.post("/api/test/osnovni/pokusaj").json()
    assert len(t["pitanja"]) == dokument["podesavanja"]["test_pitanja"]
    for q in t["pitanja"]:
        assert "a" not in q and "why" not in q and q["t"] in ("mc", "tf", "num")


def test_polozen_sertifikat_i_zrna(spreman, dokument, db):
    pre = spreman.get("/api/napredak/osnovni").json()["zrna"]
    r = uradi(spreman, dokument, pogresnih=2)
    assert r["procenat"] == 90 and r["polozen"] and r["prag"] == 80
    assert r["zrna"] == 100 and r["novi_bedzevi"] == ["ready"]
    kod = r["sertifikat"]["kod"]
    assert kod.startswith("ZP-") and len(kod) == 12 and r["sertifikat"]["procenat"] == 90

    n = spreman.get("/api/napredak/osnovni").json()
    assert n["test"] == {"najbolje": 90, "polozen": True} and n["zrna"] == pre + 100
    s = spreman.get("/api/test/osnovni").json()
    assert (s["pokusaja"], s["najbolje"], s["polozen"], s["sertifikat"]["kod"]) == (1, 90, True, kod)

    # bolji rezultat menja procenat, kod ostaje; nema novih zrna ni bedža
    r2 = uradi(spreman, dokument)
    assert r2["sertifikat"] == {**r2["sertifikat"], "kod": kod, "procenat": 100}
    assert r2["zrna"] == 0 and r2["novi_bedzevi"] == []
    # slabiji rezultat ne kvari sertifikat
    r3 = uradi(spreman, dokument, pogresnih=3)
    assert r3["sertifikat"]["procenat"] == 100


def test_pao_i_slabi_nivoi(spreman, dokument):
    r = uradi(spreman, dokument, pogresnih=8)
    assert r["procenat"] == 60 and not r["polozen"]
    assert r["sertifikat"] is None and r["zrna"] == 0 and r["novi_bedzevi"] == []
    assert r["slabi_nivoi"] and set(r["slabi_nivoi"]) <= {n["id"] for n in dokument["nivoi"]}
    assert spreman.get("/api/test/osnovni").json()["sertifikat"] is None


def test_odgovor_jednom_i_samo_iz_testa(spreman, dokument):
    t = spreman.post("/api/test/osnovni/pokusaj").json()
    q = t["pitanja"][0]
    k = pitanja_za_test(dokument)[q["id"]][1]
    url = f"/api/test/pokusaji/{t['test_id']}/odgovor"
    r = spreman.post(url, json={"pitanje": q["id"], "odgovor": tacan(k)}).json()
    assert r["rezultat"] == 1 and r["resenje"] == k["a"]
    assert spreman.post(url, json={"pitanje": q["id"], "odgovor": tacan(k)}).status_code == 409
    van = next(pid for pid in pitanja_za_test(dokument) if pid not in {x["id"] for x in t["pitanja"]})
    assert spreman.post(url, json={"pitanje": van, "odgovor": 0}).status_code == 422
    assert spreman.post(f"/api/test/pokusaji/{t['test_id']}/zavrsi").status_code == 422


def test_nov_pokusaj_prekida_stari(spreman):
    prvi = spreman.post("/api/test/osnovni/pokusaj").json()["test_id"]
    spreman.post("/api/test/osnovni/pokusaj")
    assert spreman.post(f"/api/test/pokusaji/{prvi}/zavrsi").status_code == 409
    assert spreman.get("/api/test/osnovni").json()["pokusaja"] == 0


def test_tudj_test(spreman, prijavi):
    tid = spreman.post("/api/test/osnovni/pokusaj").json()["test_id"]
    spreman.post("/api/auth/odjava")
    c = prijavi("bora.b")
    assert c.post(f"/api/test/pokusaji/{tid}/zavrsi").status_code == 404


def test_trener_proverava_i_opoziva(spreman, dokument, prijavi, db):
    kod = uradi(spreman, dokument)["sertifikat"]["kod"]
    spreman.post("/api/auth/odjava")

    c = prijavi("trener@test.rs")
    s = c.get(f"/api/admin/sertifikati/{kod.lower().replace('-', ' ')}").json()
    assert (s["kod"], s["ime"], s["procenat"], s["lokal"]["naziv"], s["opozvan_u"]) == (kod, "Ana", 100, "Lokal A", None)
    assert c.get("/api/admin/sertifikati/ZP-AAAA-AAAA").status_code == 404
    assert [x["kod"] for x in c.get("/api/admin/sertifikati").json()] == [kod]

    assert c.post(f"/api/admin/sertifikati/{s['id']}/opozovi", json={"razlog": "x"}).status_code == 422
    o = c.post(f"/api/admin/sertifikati/{s['id']}/opozovi", json={"razlog": "Nije znao uživo"}).json()
    assert o["opozvan_u"] and o["razlog_opoziva"] == "Nije znao uživo"
    assert db.scalar(select(AuditLog).where(AuditLog.akcija == "sertifikat_opozvan")) is not None
    c.post("/api/auth/odjava")

    # posle opoziva nov položen test daje nov kod
    c = prijavi("ana.a")
    assert c.get("/api/test/osnovni").json()["sertifikat"]["opozvan"] is True
    novi = uradi(c, dokument)["sertifikat"]
    assert novi["kod"] != kod and not novi["opozvan"]


def test_menadzer_vidi_samo_svoje(spreman, dokument, prijavi, db):
    kod = uradi(spreman, dokument)["sertifikat"]["kod"]
    spreman.post("/api/auth/odjava")
    c = prijavi("menadzer@test.rs")
    assert c.get(f"/api/admin/sertifikati/{kod}").status_code == 200
    ana = next(p for p in c.get("/api/admin/polaznici").json() if p["korisnicko_ime"] == "ana.a")
    assert ana["test_najbolje"] == 100 and ana["test_polozen"] is True
    sid = c.get(f"/api/admin/sertifikati/{kod}").json()["id"]
    assert c.post(f"/api/admin/sertifikati/{sid}/opozovi", json={"razlog": "probam"}).status_code == 403

    # Ana prelazi u lokal B: menadžer lokala A je više ne vidi
    ana_db = db.scalar(select(Korisnik).where(Korisnik.korisnicko_ime == "ana.a"))
    ana_db.lokal_id = 2
    db.commit()
    assert c.get(f"/api/admin/sertifikati/{kod}").status_code == 404
    assert c.get("/api/admin/sertifikati").json() == []


def test_polaznik_nema_admin_sertifikate(spreman):
    assert spreman.get("/api/admin/sertifikati").status_code == 403
