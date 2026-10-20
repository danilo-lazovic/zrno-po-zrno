from enum import StrEnum
from typing import Any

from sqlalchemy.orm import Session

from core.models import AuditLog, Korisnik


class Akcija(StrEnum):
    nalog_otvoren = "nalog_otvoren"
    nalog_izmenjen = "nalog_izmenjen"
    nalog_iskljucen = "nalog_iskljucen"
    nalog_ukljucen = "nalog_ukljucen"
    nova_pozivnica = "nova_pozivnica"
    reset_lozinke = "reset_lozinke"
    nalog_zakljucan = "nalog_zakljucan"
    lokal = "lokal"
    sadrzaj_objavljen = "sadrzaj_objavljen"


def zapisi(
    db: Session,
    korisnik: Korisnik | None,
    akcija: Akcija,
    objekat: str | None = None,
    detalji: dict[str, Any] | None = None,
) -> AuditLog:
    """Dodaje zapis u sesiju; commit radi pozivalac, zajedno sa samom izmenom."""
    zapis = AuditLog(
        korisnik_id=korisnik.id if korisnik else None,
        korisnik_naziv=korisnik.korisnicko_ime if korisnik else None,
        akcija=akcija,
        objekat=objekat,
        detalji=detalji or {},
    )
    db.add(zapis)
    return zapis
