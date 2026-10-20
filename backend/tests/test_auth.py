from core.auth import login_limiter
from core.models import Korisnik
from tests.conftest import PIN


def test_osoblje_lozinkom(prijavi):
    c = prijavi("admin@test.rs")
    me = c.get("/api/me").json()
    assert me["korisnik"]["uloga"] == "admin"
    assert me["lokali"] is None


def test_polaznik_pinom_i_velika_slova(client):
    r = client.post("/api/auth/prijava", json={"korisnicko_ime": " Ana.A ", "tajna": PIN})
    assert r.status_code == 204
    me = client.get("/api/me").json()
    assert me["korisnik"]["korisnicko_ime"] == "ana.a"
    assert me["lokal"]["naziv"] == "Lokal A"


def test_pogresno_ista_poruka(client):
    a = client.post("/api/auth/prijava", json={"korisnicko_ime": "ana.a", "tajna": "9999"})
    b = client.post("/api/auth/prijava", json={"korisnicko_ime": "nema.ga", "tajna": "9999"})
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()


def test_previse_pokusaja(client):
    for _ in range(5):
        client.post("/api/auth/prijava", json={"korisnicko_ime": "ana.a", "tajna": "9999"})
    r = client.post("/api/auth/prijava", json={"korisnicko_ime": "ana.a", "tajna": PIN})
    assert r.status_code == 429


def test_zakljucavanje_posle_10_pogresnih(client):
    for i in range(10):
        if i % 5 == 0:
            login_limiter._pokusaji.clear()
        client.post("/api/auth/prijava", json={"korisnicko_ime": "ana.a", "tajna": "9999"})
    login_limiter._pokusaji.clear()
    r = client.post("/api/auth/prijava", json={"korisnicko_ime": "ana.a", "tajna": PIN})
    assert r.status_code == 403
    assert "pozivnicu" in r.json()["detail"]


def test_odjava(prijavi):
    c = prijavi("ana.a")
    c.post("/api/auth/odjava")
    assert c.get("/api/me").status_code == 401


def test_iskljucen_polaznik_gubi_pristup(prijavi, db):
    ana = db.query(Korisnik).filter_by(korisnicko_ime="ana.a").one()
    c = prijavi("trener@test.rs")
    assert c.patch(f"/api/admin/polaznici/{ana.id}", json={"aktivan": False}).json()["status"] == "iskljucen"
    r = c.post("/api/auth/prijava", json={"korisnicko_ime": "ana.a", "tajna": PIN})
    assert r.status_code == 401
