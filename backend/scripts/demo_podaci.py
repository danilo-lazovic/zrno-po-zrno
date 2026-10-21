"""Demo polaznici sa napretkom, samo za lokalni razvoj (poziva ga `python seed.py --demo`).

Pravi 12 polaznika u dva demo lokala preko pravog API-ja: prolaze nivoe sa nasumičnim greškama, igraju igre
i rade završni test, pa se vremena pomeraju unazad do dve nedelje, da statistika, rang lista i podsetnici
imaju šta da pokažu. PIN svih demo polaznika je isti kao za demo.polaznik. Ne pokreće se dvaput.
"""

import random
import warnings
from typing import Any

from sqlalchemy import select, text

from core.db import SessionLocal
from core.models import Lokal
from main import app
from modules.sadrzaj.kurs import objavljen_kurs

with warnings.catch_warnings():
    # Starlette upozorava na httpx; za lokalnu skriptu nije bitno
    warnings.simplefilter("ignore")
    from fastapi.testclient import TestClient

DRUGI_LOKAL = "Demo Ušće"
IMENA = [("Marko", "Petrović"), ("Jelena", "Ilić"), ("Nikola", "Jovanović"), ("Ana", "Marković"), ("Stefan", "Nikolić"),
         ("Milica", "Pavlović"), ("Luka", "Đorđević"), ("Teodora", "Stojanović"), ("Vuk", "Kostić"), ("Sara", "Lazić"),
         ("Filip", "Tomić"), ("Mina", "Popović")]
# (koliko nivoa prelazi, verovatnoća greške, pre koliko dana je poslednji put učio)
PROFILI = [(8, .05, 0), (8, .1, 0), (8, .2, 1), (7, .15, 2), (6, .3, 9), (5, .2, 3), (4, .35, 12), (3, .1, 1), (2, .4, 8),
           (1, .2, 4), (0, 0, 0), (8, .45, 5)]
# pitanja koja demo polaznici češće promaše, da se vidi spisak najtežih
TEZA = {"m2.k09", "m4.k07", "m5.k06", "m6.k05", "m3.k07"}
IZAZOVI = {"mc", "tf", "num", "order", "match", "sort", "hotspot", "game"}


def _mc_izbor(rng: random.Random, k: dict[str, Any], tacno: bool) -> int:
    return k["a"] if tacno else (k["a"] + 1 + rng.randrange(len(k["opts"]) - 1)) % len(k["opts"])


def _odgovor_na_test(rng: random.Random, k: dict[str, Any], tacno: bool) -> Any:
    if k["t"] == "tf":
        return k["a"] if tacno else not k["a"]
    if k["t"] == "mc":
        return _mc_izbor(rng, k, tacno)
    return k["a"][0] if tacno else k["min"]


def napravi(lozinka: str, pin: str) -> None:
    with SessionLocal() as db:
        if db.scalar(select(Lokal.id).where(Lokal.naziv == DRUGI_LOKAL)):
            print("demo polaznici već postoje")
            return
        dok = objavljen_kurs(db, "osnovni").verzija.dokument
        postgres = db.bind.dialect.name == "postgresql"

    rng = random.Random(7)
    admin = TestClient(app)
    assert admin.post("/api/auth/prijava", json={"korisnicko_ime": "admin@kafeterija.test", "tajna": lozinka}).status_code == 204
    lokali = {x["naziv"]: x["id"] for x in admin.get("/api/admin/lokali").json()}
    lokali[DRUGI_LOKAL] = admin.post("/api/admin/lokali", json={"naziv": DRUGI_LOKAL, "grad": "Beograd"}).json()["id"]
    pitanja = {x["id"]: x for n in dok["nivoi"] for x in [*n["steps"], *n["pool"]]}

    pomaci: list[tuple[int, int]] = []
    for i, ((ime, prezime), (nivoa, greska, pre_dana)) in enumerate(zip(IMENA, PROFILI)):
        lokal = lokali["Demo lokal"] if i % 2 == 0 else lokali[DRUGI_LOKAL]
        p = admin.post("/api/admin/polaznici", json={"ime": ime, "prezime": prezime, "lokal_id": lokal}).json()
        if nivoa == 0:
            print(f"{p['polaznik']['korisnicko_ime']}: pozvan, još bez PIN-a")
            continue
        c = TestClient(app)
        assert c.post(f"/api/pozivnica/{p['link'].rsplit('/', 1)[1]}", json={"pin": pin}).status_code == 204
        c.patch("/api/me", json={"avatar": rng.choice(["zrno", "tresnja", "soljica", "latijera"])})
        pomaci.append((p["polaznik"]["id"], pre_dana))

        for n in dok["nivoi"][:nivoa]:
            pid = c.post(f"/api/napredak/osnovni/nivoi/{n['id']}/prolaz").json()["prolaz_id"]
            for k in n["steps"]:
                if k["t"] not in IZAZOVI:
                    continue
                tacno = rng.random() > greska * (2.5 if k["id"] in TEZA else 1)
                telo: dict[str, Any] = {"pitanje": k["id"], "rezultat": 1 if tacno else rng.choice([0, 0, 0.5])}
                if k["t"] == "mc":
                    telo["izbor"] = _mc_izbor(rng, k, tacno)
                c.post(f"/api/napredak/prolazi/{pid}/odgovor", json=telo)
            c.post(f"/api/napredak/prolazi/{pid}/zavrsi")
        for g in dok["igre"]:
            if any(n["id"] == g["after"] for n in dok["nivoi"][:nivoa]):
                for _ in range(rng.randint(1, 3)):
                    r = max(0.0, min(1.0, rng.gauss(0.8 - greska, 0.15)))
                    c.post("/api/igre/osnovni/rezultat", json={
                        "igra_id": g["id"], "rezultat": r, "zvezdice": 0, "trajanje_ms": 60000, "detalji": {}, "izvor": "js",
                        "kontekst": "igraonica", "poeni": round(r * 40) if g["id"] == "swipe" else round(r * 100)})
        if nivoa == len(dok["nivoi"]):
            for pokusaj in range(2):
                t = c.post("/api/test/osnovni/pokusaj").json()
                for q in t["pitanja"]:
                    tacno = rng.random() > greska * (1.4 if pokusaj == 0 else 0.6)
                    c.post(f"/api/test/pokusaji/{t['test_id']}/odgovor",
                           json={"pitanje": q["id"], "odgovor": _odgovor_na_test(rng, pitanja[q["id"]], tacno)})
                if c.post(f"/api/test/pokusaji/{t['test_id']}/zavrsi").json()["polozen"]:
                    break
        print(f"{p['polaznik']['korisnicko_ime']}: {nivoa} nivoa")

    if not postgres:
        return
    # aktivnost se raširi kroz poslednje dve nedelje (svaki polaznik ima svoj poslednji dan)
    with SessionLocal() as db:
        for uid, pre_dana in pomaci:
            for tabela, kol in (("odgovori", "u"), ("igre_rezultati", "u"), ("zrna", "u"), ("prolazi_nivoa", "kraj"),
                                ("testovi", "kraj"), ("bedzevi_korisnika", "u"), ("nivoi_korisnika", "zavrsen_u")):
                db.execute(text(f"UPDATE {tabela} SET {kol} = {kol} - make_interval(days => :d) "
                                "- make_interval(hours => (random() * 24)::int) WHERE korisnik_id = :u"),
                           {"d": pre_dana + rng.randint(0, 3), "u": uid})
            db.execute(text("UPDATE zrna SET dan = (u AT TIME ZONE 'Europe/Belgrade')::date WHERE korisnik_id = :u"), {"u": uid})
            db.execute(text("UPDATE korisnici SET poslednja_prijava = now() - make_interval(days => :d) WHERE id = :u"),
                       {"d": pre_dana, "u": uid})
        db.commit()
