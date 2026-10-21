import json
import os
from pathlib import Path

os.environ.setdefault("SECRET_KEY", "test-secret-key-koji-je-dovoljno-dugacak")
os.environ["ENV"] = "test"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import modules.igre.models  # noqa: F401
import modules.napredak.models  # noqa: F401
import modules.sadrzaj.models  # noqa: F401
import modules.test.models  # noqa: F401
from core.auth import login_limiter
from core.db import get_db
from core.models import Base, Korisnik, Lokal, Uloga
from core.security import hash_tajne
from main import app
from modules.sadrzaj.uvoz import objavi

LOZINKA = "test-lozinka-123"
PIN = "2580"
SADRZAJ = Path(__file__).parents[1] / "modules" / "sadrzaj" / "data" / "osnovni-nivo.json"

# TEST_DATABASE_URL=postgresql+psycopg://... za pokretanje nad pravim Postgresom
engine = create_engine(
    os.environ.get("TEST_DATABASE_URL", "sqlite+pysqlite:///:memory:"),
    connect_args={"check_same_thread": False} if "TEST_DATABASE_URL" not in os.environ else {},
    poolclass=StaticPool,
)
TestSession = sessionmaker(engine, expire_on_commit=False)

if engine.dialect.name == "sqlite":

    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")


def nov_korisnik(**polja) -> Korisnik:
    return Korisnik(aktivan=True, neuspeli_pin=0, zakljucan=False, **polja)


@pytest.fixture
def dokument():
    return json.loads(SADRZAJ.read_text(encoding="utf-8"))


@pytest.fixture
def db(dokument):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestSession() as session:
        a, b = Lokal(naziv="Lokal A", aktivan=True), Lokal(naziv="Lokal B", aktivan=True)
        session.add_all([a, b])
        session.flush()
        lozinka = hash_tajne(LOZINKA)
        for uloga in (Uloga.admin, Uloga.trener, Uloga.menadzer):
            email = f"{uloga}@test.rs"
            session.add(
                nov_korisnik(
                    ime=uloga.capitalize(), prezime="Test", korisnicko_ime=email, email=email, uloga=uloga,
                    lozinka_hash=lozinka, lokali=[a] if uloga == Uloga.menadzer else [],
                )
            )
        pin = hash_tajne(PIN)
        session.add(nov_korisnik(ime="Ana", prezime="A", korisnicko_ime="ana.a", uloga=Uloga.polaznik, lokal_id=a.id, pin_hash=pin))
        session.add(nov_korisnik(ime="Bora", prezime="B", korisnicko_ime="bora.b", uloga=Uloga.polaznik, lokal_id=b.id, pin_hash=pin))
        objavi(session, dokument)
        session.commit()
        yield session


@pytest.fixture
def client(db):
    def _get_db():
        with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db
    login_limiter._pokusaji.clear()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def prijavi(client):
    def _prijavi(ko: str) -> TestClient:
        tajna = PIN if "@" not in ko else LOZINKA
        r = client.post("/api/auth/prijava", json={"korisnicko_ime": ko, "tajna": tajna})
        assert r.status_code == 204, r.text
        return client

    return _prijavi
