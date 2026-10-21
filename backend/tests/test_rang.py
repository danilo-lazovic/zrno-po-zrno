from datetime import date, timedelta

from sqlalchemy import select

from core.models import Korisnik, Lokal, Uloga
from core.security import hash_tajne
from core.vreme import danas
from modules.napredak.models import Zrno
from modules.rang.router import nedelja
from tests.conftest import PIN, nov_korisnik


def test_nedelja_od_ponedeljka():
    assert nedelja(date(2026, 10, 21)) == (date(2026, 10, 19), date(2026, 10, 25))  # sreda
    assert nedelja(date(2026, 10, 19)) == (date(2026, 10, 19), date(2026, 10, 25))  # ponedeljak
    assert nedelja(date(2026, 10, 25)) == (date(2026, 10, 19), date(2026, 10, 25))  # nedelja
    assert nedelja(date(2026, 10, 21), -1) == (date(2026, 10, 12), date(2026, 10, 18))


def _kolege(db):
    """Lokal A: Ana (iz conftest), Cica i Dule sa PIN-om, Ema bez PIN-a; Bora je u lokalu B."""
    a = db.scalar(select(Lokal).where(Lokal.naziv == "Lokal A"))
    pin = hash_tajne(PIN)
    for ime, p in (("Cica", pin), ("Dule", pin), ("Ema", None)):
        db.add(nov_korisnik(ime=ime, prezime="Cvetić", korisnicko_ime=ime.lower(), uloga=Uloga.polaznik, lokal_id=a.id, pin_hash=p))
    db.flush()
    ids = {k.korisnicko_ime: k.id for k in db.scalars(select(Korisnik))}
    pon, _ = nedelja(danas())
    for ko, iznos, dan in (
        ("cica", 30, pon), ("cica", 20, danas()), ("ana.a", 50, danas()), ("bora.b", 99, danas()),
        ("dule", 500, pon - timedelta(days=1)),  # prošla nedelja
    ):
        db.add(Zrno(korisnik_id=ids[ko], kurs_id=1, iznos=iznos, razlog="odgovor", dan=dan))
    db.commit()


def test_polaznik_vidi_kolege_iz_lokala(prijavi, db):
    _kolege(db)
    r = prijavi("ana.a").get("/api/rang/osnovni").json()
    assert r["lokal"] == "Lokal A" and r["polaznika"] == 3  # Ema još nije postavila PIN
    # isti broj zrna, isto mesto; Dule ove nedelje nema zrna pa se ne vidi
    assert [(x["ime"], x["zrna"], x["mesto"], x["ja"]) for x in r["redovi"]] == [
        ("Ana A.", 50, 1, True),
        ("Cica C.", 50, 1, False),
    ]
    assert r["pocetak"] == nedelja(danas())[0].isoformat()


def test_prosla_nedelja_i_sebe_uvek_vidi(prijavi, db):
    _kolege(db)
    c = prijavi("ana.a")
    r = c.get("/api/rang/osnovni?pomak=-1").json()
    assert [(x["ime"], x["zrna"], x["mesto"]) for x in r["redovi"]] == [("Dule C.", 500, 1), ("Ana A.", 0, 2)]
    assert c.get("/api/rang/osnovni?pomak=-2").status_code == 422


def test_osoblje_vidi_ceo_lokal_u_granicama_pristupa(prijavi, db):
    _kolege(db)
    c = prijavi("trener@test.rs")
    sve = c.get("/api/admin/rang/osnovni").json()
    assert [x["lokal"] for x in sve] == ["Lokal A", "Lokal B"]
    assert [x["ime"] for x in sve[0]["redovi"]] == ["Ana A", "Cica Cvetić", "Dule Cvetić"]  # i oni bez zrna, puno ime
    c.post("/api/auth/odjava")

    c = prijavi("menadzer@test.rs")  # samo lokal A
    assert [x["lokal"] for x in c.get("/api/admin/rang/osnovni").json()] == ["Lokal A"]
    b = db.scalar(select(Lokal.id).where(Lokal.naziv == "Lokal B"))
    assert c.get(f"/api/admin/rang/osnovni?lokal_id={b}").status_code == 403
    c.post("/api/auth/odjava")
    assert prijavi("ana.a").get("/api/admin/rang/osnovni").status_code == 403


def test_polaznik_bez_lokala(prijavi, db):
    ana = db.scalar(select(Korisnik).where(Korisnik.korisnicko_ime == "ana.a"))
    ana.lokal_id = None
    db.commit()
    r = prijavi("ana.a").get("/api/rang/osnovni").json()
    assert (r["lokal"], r["redovi"]) == (None, [])
