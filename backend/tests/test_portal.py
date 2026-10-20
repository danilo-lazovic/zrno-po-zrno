import httpx
import pytest
from sqlalchemy import select

from core.config import get_settings
from core.models import Korisnik, Lokal
from modules.osoblje import portal

PORTAL = [
    {"id": 11, "naziv": "Lokal A", "grad": "Beograd", "format": "ulica", "izvor": "evidencija"},
    {"id": 12, "naziv": "Ušće", "grad": "Beograd", "format": "TC", "izvor": "evidencija"},
    {"id": 99, "naziv": "Mock 1", "grad": None, "format": None, "izvor": "mock"},
]


@pytest.fixture
def portal_api(monkeypatch):
    """Lažni portal: beleži zahteve i vraća zadate lokale."""
    stanje = {"lokali": PORTAL, "kod": 200, "svi": True, "zahtevi": []}

    def odgovor(req: httpx.Request) -> httpx.Response:
        stanje["zahtevi"].append(req)
        return httpx.Response(stanje["kod"], json={"svi_lokali": stanje["svi"], "lokali": stanje["lokali"]})

    s = get_settings()
    monkeypatch.setattr(s, "portal_url", "https://portal.test")
    monkeypatch.setattr(s, "portal_kljuc", "kp_test")
    pravi = portal.preuzmi
    monkeypatch.setattr(portal, "preuzmi", lambda: pravi(httpx.Client(transport=httpx.MockTransport(odgovor))))
    return stanje


def test_preuzimanje(prijavi, db, portal_api):
    c = prijavi("admin@test.rs")
    r = c.post("/api/admin/lokali/portal")
    assert r.status_code == 200, r.text
    # Lokal A je bio ručno unet: prelazi pod portal i zadržava polaznike
    assert r.json() == {"novih": 1, "izmenjenih": 1, "zatvorenih": 0, "ukupno": 2}
    zahtev = portal_api["zahtevi"][0]
    assert str(zahtev.url) == "https://portal.test/api/me"
    assert zahtev.headers["authorization"] == "Bearer kp_test"

    lokali = {l["naziv"]: l for l in c.get("/api/admin/lokali").json()}
    assert lokali["Ušće"]["izvor"] == "portal" and lokali["Ušće"]["format"] == "TC"
    assert lokali["Lokal B"]["izvor"] == "rucno"
    assert "Mock 1" not in lokali
    db.expire_all()
    ana = db.scalar(select(Korisnik).where(Korisnik.korisnicko_ime == "ana.a"))
    assert ana.lokal.naziv == "Lokal A" and ana.lokal.portal_id == 11


def test_ponovno_preuzimanje_menja_i_zatvara(prijavi, db, portal_api):
    c = prijavi("admin@test.rs")
    c.post("/api/admin/lokali/portal")
    portal_api["lokali"] = [{"id": 12, "naziv": "Ušće Shopping", "grad": "Beograd", "format": "TC", "izvor": "evidencija"}]
    assert c.post("/api/admin/lokali/portal").json() == {"novih": 0, "izmenjenih": 1, "zatvorenih": 1, "ukupno": 1}
    lokali = {l["naziv"]: l for l in c.get("/api/admin/lokali").json()}
    assert lokali["Ušće Shopping"]["aktivan"] and not lokali["Lokal A"]["aktivan"]
    # ponovo isto: ništa se ne menja
    assert c.post("/api/admin/lokali/portal").json() == {"novih": 0, "izmenjenih": 0, "zatvorenih": 0, "ukupno": 1}


def test_lokal_iz_portala_se_ne_menja_ovde(prijavi, db, portal_api):
    c = prijavi("admin@test.rs")
    c.post("/api/admin/lokali/portal")
    usce = db.scalar(select(Lokal.id).where(Lokal.naziv == "Ušće"))
    r = c.patch(f"/api/admin/lokali/{usce}", json={"naziv": "Drugo"})
    assert r.status_code == 422 and "portalu" in r.json()["detail"]


@pytest.mark.parametrize("kod, svi, poruka", [(401, True, "ključ"), (500, True, "500"), (200, False, "admin")])
def test_greske_portala(prijavi, portal_api, kod, svi, poruka):
    portal_api["kod"], portal_api["svi"] = kod, svi
    r = prijavi("admin@test.rs").post("/api/admin/lokali/portal")
    assert r.status_code == 502 and poruka in r.json()["detail"]


def test_bez_podesavanja(prijavi, monkeypatch):
    monkeypatch.setattr(get_settings(), "portal_url", None)
    r = prijavi("admin@test.rs").post("/api/admin/lokali/portal")
    assert r.status_code == 502 and "PORTAL_URL" in r.json()["detail"]


def test_samo_admin(prijavi, portal_api):
    assert prijavi("trener@test.rs").post("/api/admin/lokali/portal").status_code == 403
