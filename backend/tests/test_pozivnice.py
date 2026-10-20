from fastapi.testclient import TestClient
from sqlalchemy import select

from core.models import AuditLog, Korisnik, Lokal
from main import app
from tests.conftest import PIN


def _lokal(db, naziv) -> int:
    return db.scalar(select(Lokal.id).where(Lokal.naziv == naziv))


def _polaznik(db, korisnicko_ime) -> int:
    return db.scalar(select(Korisnik.id).where(Korisnik.korisnicko_ime == korisnicko_ime))


def _token(link: str) -> str:
    return link.rsplit("/", 1)[1]


def test_menadzer_dodaje_u_svoj_lokal(prijavi, db):
    c = prijavi("menadzer@test.rs")
    r = c.post("/api/admin/polaznici", json={"ime": "Đorđe", "prezime": "Šćepanović", "lokal_id": _lokal(db, "Lokal A")})
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["polaznik"]["korisnicko_ime"] == "djordje.scepanovic"
    assert p["polaznik"]["status"] == "pozvan"
    assert "/pozivnica/" in p["link"]

    r = c.post("/api/admin/polaznici", json={"ime": "X", "prezime": "Y", "lokal_id": _lokal(db, "Lokal B")})
    assert r.status_code == 403


def test_isto_ime_dobija_broj(prijavi, db):
    c = prijavi("trener@test.rs")
    telo = {"ime": "Ana", "prezime": "A", "lokal_id": _lokal(db, "Lokal A")}
    imena = [c.post("/api/admin/polaznici", json=telo).json()["polaznik"]["korisnicko_ime"] for _ in range(2)]
    assert imena == ["ana.a2", "ana.a3"]


def test_tok_pozivnice(prijavi, client, db):
    c = prijavi("trener@test.rs")
    p = c.post("/api/admin/polaznici", json={"ime": "Mila", "prezime": "M", "lokal_id": _lokal(db, "Lokal B")}).json()
    token = _token(p["link"])
    c.post("/api/auth/odjava")

    info = client.get(f"/api/pozivnica/{token}").json()
    assert (info["ime"], info["korisnicko_ime"], info["lokal"]) == ("Mila", "mila.m", "Lokal B")

    for los in ("1234", "7777", "12a4", "98765"):
        assert client.post(f"/api/pozivnica/{token}", json={"pin": los}).status_code == 422, los
    assert client.post(f"/api/pozivnica/{token}", json={"pin": "4826"}).status_code == 204
    assert client.get("/api/me").json()["korisnik"]["korisnicko_ime"] == "mila.m"

    # jednokratna
    assert client.get(f"/api/pozivnica/{token}").status_code == 404
    assert client.post(f"/api/pozivnica/{token}", json={"pin": "4826"}).status_code == 404

    client.post("/api/auth/odjava")
    assert client.post("/api/auth/prijava", json={"korisnicko_ime": "mila.m", "tajna": "4826"}).status_code == 204


def test_nepostojeca_pozivnica(client):
    assert client.get("/api/pozivnica/izmisljen-token").status_code == 404


def test_nova_pozivnica_obara_staru_i_prijave(prijavi, client, db):
    telefon = TestClient(app)
    assert telefon.post("/api/auth/prijava", json={"korisnicko_ime": "bora.b", "tajna": PIN}).status_code == 204
    assert telefon.get("/api/me").status_code == 200

    c = prijavi("trener@test.rs")
    bora = _polaznik(db, "bora.b")
    prva = _token(c.post(f"/api/admin/polaznici/{bora}/pozivnica").json()["link"])
    druga = c.post(f"/api/admin/polaznici/{bora}/pozivnica").json()
    assert druga["polaznik"]["status"] == "pozvan"

    assert telefon.get("/api/me").status_code == 401
    assert telefon.post("/api/auth/prijava", json={"korisnicko_ime": "bora.b", "tajna": PIN}).status_code == 401
    assert client.get(f"/api/pozivnica/{prva}").status_code == 404
    assert client.get(f"/api/pozivnica/{_token(druga['link'])}").status_code == 200
    assert db.scalar(select(AuditLog).where(AuditLog.akcija == "nova_pozivnica")) is not None


def test_menadzer_vidi_samo_svoje(prijavi, db):
    c = prijavi("menadzer@test.rs")
    assert [p["korisnicko_ime"] for p in c.get("/api/admin/polaznici").json()] == ["ana.a"]
    assert [lokal["naziv"] for lokal in c.get("/api/admin/lokali").json()] == ["Lokal A"]
    bora = _polaznik(db, "bora.b")
    assert c.patch(f"/api/admin/polaznici/{bora}", json={"ime": "X"}).status_code == 404
    assert c.post(f"/api/admin/polaznici/{bora}/pozivnica").status_code == 404
    ana = _polaznik(db, "ana.a")
    assert c.patch(f"/api/admin/polaznici/{ana}", json={"lokal_id": _lokal(db, "Lokal B")}).status_code == 403


def test_polaznik_nema_admin(prijavi):
    c = prijavi("ana.a")
    assert c.get("/api/admin/polaznici").status_code == 403
    assert c.get("/api/admin/lokali").status_code == 403


def test_osoblje_samo_admin(prijavi, db):
    c = prijavi("trener@test.rs")
    assert c.get("/api/admin/osoblje").status_code == 403
    c.post("/api/auth/odjava")

    c = prijavi("admin@test.rs")
    r = c.post("/api/admin/osoblje", json={
        "ime": "Nova", "prezime": "Menadžerka", "email": "Nova@Test.rs", "uloga": "menadzer",
        "lozinka": "dugacka-lozinka", "lokal_ids": [_lokal(db, "Lokal B")],
    })
    assert r.status_code == 201, r.text
    assert r.json()["email"] == "nova@test.rs"
    assert [lokal["naziv"] for lokal in r.json()["lokali"]] == ["Lokal B"]

    r = c.post("/api/admin/osoblje", json={
        "ime": "P", "prezime": "P", "email": "p@test.rs", "uloga": "polaznik", "lozinka": "dugacka-lozinka",
    })
    assert r.status_code == 422

    admin = _polaznik(db, "admin@test.rs")
    assert c.patch(f"/api/admin/osoblje/{admin}", json={"aktivan": False}).status_code == 422


def test_admin_lokali(prijavi):
    c = prijavi("admin@test.rs")
    assert c.post("/api/admin/lokali", json={"naziv": "Lokal C", "grad": "Novi Sad"}).status_code == 201
    assert c.post("/api/admin/lokali", json={"naziv": "Lokal C"}).status_code == 409
    c.post("/api/auth/odjava")
    c = prijavi("trener@test.rs")
    assert c.post("/api/admin/lokali", json={"naziv": "Lokal D"}).status_code == 403
