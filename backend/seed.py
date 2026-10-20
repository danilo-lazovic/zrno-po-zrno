"""Lokalni razvoj: sadržaj kursa, admin nalog i (uz --demo) demo lokal sa trenerom, menadžerom i polaznikom.

Pokretanje iz backend/:  python seed.py [--demo]
Sadržaj (data/*.json) se uvozi i u produkciji: `python seed.py --samo-sadrzaj`.
Lozinka osoblja je SEED_LOZINKA iz .env, PIN demo polaznika 2580. Skripta je idempotentna.
"""

import json
import sys
from pathlib import Path

from sqlalchemy import select

from core.config import get_settings
from core.db import SessionLocal
from core.models import Korisnik, Lokal, Uloga
from core.security import hash_tajne
from modules.sadrzaj.uvoz import objavi

DATA = Path(__file__).parent / "modules" / "sadrzaj" / "data"
DEMO_LOKAL = "Demo lokal"
DEMO_PIN = "2580"


def uvezi_sadrzaj(db) -> None:
    for fajl in sorted(DATA.glob("*.json")):
        v = objavi(db, json.loads(fajl.read_text(encoding="utf-8")), napomena=f"uvoz {fajl.name}")
        print(f"{fajl.name}: kurs {v.kurs_id}, verzija {v.broj}")


def _korisnik(db, korisnicko_ime: str, **polja) -> Korisnik:
    k = db.scalar(select(Korisnik).where(Korisnik.korisnicko_ime == korisnicko_ime))
    if k is None:
        k = Korisnik(korisnicko_ime=korisnicko_ime, aktivan=True, neuspeli_pin=0, zakljucan=False, **polja)
        db.add(k)
        print(f"nalog {korisnicko_ime}")
    return k


def main() -> None:
    settings = get_settings()
    samo_sadrzaj = "--samo-sadrzaj" in sys.argv
    if settings.produkcija and not samo_sadrzaj:
        sys.exit("U produkciji samo: python seed.py --samo-sadrzaj")
    if not samo_sadrzaj and not settings.seed_lozinka:
        sys.exit("Postavi SEED_LOZINKA u .env (najmanje 10 znakova).")

    with SessionLocal() as db:
        uvezi_sadrzaj(db)
        if not samo_sadrzaj:
            lozinka = hash_tajne(settings.seed_lozinka)
            _korisnik(db, "admin@kafeterija.test", ime="Admin", prezime="Test", email="admin@kafeterija.test",
                      uloga=Uloga.admin, lozinka_hash=lozinka)
            if "--demo" in sys.argv:
                lokal = db.scalar(select(Lokal).where(Lokal.naziv == DEMO_LOKAL))
                if lokal is None:
                    lokal = Lokal(naziv=DEMO_LOKAL, grad="Beograd", aktivan=True, izvor="demo")
                    db.add(lokal)
                    db.flush()
                _korisnik(db, "trener@kafeterija.test", ime="Trener", prezime="Test", email="trener@kafeterija.test",
                          uloga=Uloga.trener, lozinka_hash=lozinka)
                m = _korisnik(db, "menadzer@kafeterija.test", ime="Menadžer", prezime="Test",
                              email="menadzer@kafeterija.test", uloga=Uloga.menadzer, lozinka_hash=lozinka)
                m.lokali = [lokal]
                _korisnik(db, "demo.polaznik", ime="Demo", prezime="Polaznik", uloga=Uloga.polaznik,
                          lokal_id=lokal.id, pin_hash=hash_tajne(DEMO_PIN))
        db.commit()


if __name__ == "__main__":
    main()
