import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from core.vreme import TZ
from modules.napredak.models import Odgovor, ProlazNivoa, Zrno
from tests.test_napredak import izazovi


def sinhronizuj(c, dokument, nivo, kljuc=None, kada=None, odgovori=None, **dodatno):
    odgovori = odgovori if odgovori is not None else [{"pitanje": p, "rezultat": 1} for p in izazovi(dokument, nivo)]
    return c.post(
        f"/api/napredak/osnovni/nivoi/{nivo}/sinhronizacija",
        json={"kljuc": kljuc or str(uuid.uuid4()), "odgovori": odgovori,
              "zavrseno_u": (kada or datetime.now(UTC)).isoformat(), **dodatno},
    )


def test_nivo_bez_mreze_isto_kao_sa_mrezom(prijavi, dokument):
    c = prijavi("ana.a")
    r = sinhronizuj(c, dokument, "m1")
    assert r.status_code == 200, r.text
    k = r.json()
    n = len(izazovi(dokument, "m1"))
    # isti obračun kao prolaz sa mrežom: 10 po odgovoru + niz, 40 bonus za prvi prolaz bez greške
    niz = sum(min(10, (i - 2) * 2) for i in range(3, n + 1))
    assert (k["tacnost"], k["zvezdice"], k["bonus"], k["zrna_prolaz"]) == (100, 3, 40, 10 * n + niz + 40)
    assert {"first", "perfect", "combo5"} <= set(k["novi_bedzevi"])
    assert c.get("/api/napredak/osnovni").json()["nivoi"]["m1"]["zavrsen"]


def test_isti_kljuc_se_ne_upisuje_dvaput(prijavi, dokument, db):
    c = prijavi("ana.a")
    kljuc = str(uuid.uuid4())
    prvi = sinhronizuj(c, dokument, "m1", kljuc).json()
    drugi = sinhronizuj(c, dokument, "m1", kljuc)
    assert drugi.status_code == 200
    assert drugi.json()["ukupno_zrna"] == prvi["ukupno_zrna"] and drugi.json()["novi_bedzevi"] == []
    assert db.scalar(select(func.count()).select_from(ProlazNivoa)) == 1


def test_vreme_prelaska_se_cuva_za_niz_dana(prijavi, dokument, db):
    c = prijavi("ana.a")
    juce = datetime.now(UTC) - timedelta(days=1)
    sinhronizuj(c, dokument, "m1", kada=juce)
    dani = set(db.scalars(select(Zrno.dan)))
    assert dani == {juce.astimezone(TZ).date()}
    # danas još jedan nivo: dva dana zaredom
    assert sinhronizuj(c, dokument, "m2").json()["niz_dana"] == 2


def test_vreme_iz_buducnosti_i_staro_se_ogranicava(prijavi, dokument, db):
    c = prijavi("ana.a")
    sinhronizuj(c, dokument, "m1", kada=datetime.now(UTC) - timedelta(days=30))
    sinhronizuj(c, dokument, "m2", kada=datetime.now(UTC) + timedelta(days=5))
    u = sorted(db.scalars(select(Odgovor.u)))
    sad = datetime.now(UTC)
    assert sad - timedelta(days=3, minutes=1) <= u[0].replace(tzinfo=UTC) <= sad - timedelta(days=3) + timedelta(minutes=1)
    assert u[-1].replace(tzinfo=UTC) <= sad + timedelta(seconds=5)


def test_nastavak_prekinutog_prolaza(prijavi, dokument, db):
    c = prijavi("ana.a")
    pitanja = izazovi(dokument, "m1")
    pid = c.post("/api/napredak/osnovni/nivoi/m1/prolaz").json()["prolaz_id"]
    for p in pitanja[:2]:
        c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": p, "rezultat": 1})
    # veza je pukla: telefon šalje sve odgovore, server preskače dva već upisana
    r = sinhronizuj(c, dokument, "m1", prolaz_id=pid, odgovori=[{"pitanje": p, "rezultat": 1} for p in pitanja])
    assert r.status_code == 200, r.text
    assert db.scalar(select(func.count()).select_from(Odgovor)) == len(pitanja)
    assert db.scalar(select(func.count()).select_from(ProlazNivoa)) == 1


def test_zavrsen_prolaz_vraca_sazetak(prijavi, dokument):
    c = prijavi("ana.a")
    pid = c.post("/api/napredak/osnovni/nivoi/m1/prolaz").json()["prolaz_id"]
    for p in izazovi(dokument, "m1"):
        c.post(f"/api/napredak/prolazi/{pid}/odgovor", json={"pitanje": p, "rezultat": 1})
    zbir = c.post(f"/api/napredak/prolazi/{pid}/zavrsi").json()["ukupno_zrna"]
    # odgovor na "završi" se izgubio, telefon šalje ponovo
    r = sinhronizuj(c, dokument, "m1", prolaz_id=pid)
    assert r.status_code == 200 and r.json()["ukupno_zrna"] == zbir


def test_greske_sinhronizacije(prijavi, client, dokument):
    c = prijavi("ana.a")
    pitanja = izazovi(dokument, "m1")
    # nedostaje odgovor: nivo nije pređen
    assert sinhronizuj(c, dokument, "m1", odgovori=[{"pitanje": pitanja[0], "rezultat": 1}]).status_code == 422
    # zaključan nivo
    assert sinhronizuj(c, dokument, "m3").status_code == 403
    # pitanje kog više nema se preskače
    odg = [{"pitanje": "m1.k99", "rezultat": 1}] + [{"pitanje": p, "rezultat": 1} for p in pitanja]
    assert sinhronizuj(c, dokument, "m1", odgovori=odg).status_code == 200
    # tuđ prolaz
    pid = c.post("/api/napredak/osnovni/nivoi/m2/prolaz").json()["prolaz_id"]
    c.post("/api/auth/odjava")
    c = prijavi("bora.b")
    assert sinhronizuj(c, dokument, "m2", prolaz_id=pid).status_code == 404
    assert sinhronizuj(c, dokument, "m1", kljuc="nije-uuid").status_code == 422
