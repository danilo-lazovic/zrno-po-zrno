"""Pravila bodovanja iz artifacta (design/artifact/app.js: answer, finishLesson, gain, award).

Server ih primenjuje, klijent samo prikazuje ono što server vrati.
"""

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.vreme import danas, sada
from modules.napredak.models import BedzKorisnika, NivoKorisnika, Zrno

POTPUNO = 0.99


def zrna_za_odgovor(rezultat: float, niz_pre: int) -> tuple[int, int, bool]:
    """(zrna, niz posle, greška). Tačan odgovor produžava niz; od trećeg zaredom ide bonus do +10."""
    if rezultat >= POTPUNO:
        niz = niz_pre + 1
        bonus = min(10, (niz - 2) * 2) if niz >= 3 else 0
        return round(10 * rezultat) + bonus, niz, False
    return round(10 * rezultat), 0, True


def zvezdice_za(tacnost: float) -> int:
    return 3 if tacnost >= 0.9 else 2 if tacnost >= 0.7 else 1


def bonus_za_nivo(greske: int, prvi_put: bool) -> int:
    bonus = 20 + (20 if greske == 0 else 0)
    return bonus if prvi_put else round(bonus / 2)


def dani_zaredom(dani: list[date], danas_: date) -> tuple[int, int]:
    """(tekući niz, najduži niz) iz dana sa zrnima. Niz traje dok je poslednji dan danas ili juče."""
    if not dani:
        return 0, 0
    dani = sorted(set(dani))
    najduzi = tekuci = 1
    for a, b in zip(dani, dani[1:]):
        tekuci = tekuci + 1 if b - a == timedelta(days=1) else 1
        najduzi = max(najduzi, tekuci)
    if (danas_ - dani[-1]).days > 1:
        tekuci = 0
    return tekuci, najduzi


def dani_sa_zrnima(db: Session, korisnik_id: int, kurs_id: int) -> list[date]:
    return list(
        db.scalars(
            select(Zrno.dan).where(Zrno.korisnik_id == korisnik_id, Zrno.kurs_id == kurs_id).group_by(Zrno.dan)
        )
    )


def dodeli_bedz(db: Session, korisnik_id: int, kurs_id: int, bedz: str, novi: list[str]) -> None:
    if bedz in novi or db.get(BedzKorisnika, (korisnik_id, kurs_id, bedz)):
        return
    db.add(BedzKorisnika(korisnik_id=korisnik_id, kurs_id=kurs_id, bedz=bedz, u=sada()))
    novi.append(bedz)


def dodaj_zrna(
    db: Session, korisnik_id: int, kurs_id: int, iznos: int, razlog: str, objekat: str | None, novi: list[str]
) -> None:
    """Upisuje zrna i proverava niz dana (bedž "Tri dana zaredom")."""
    if iznos <= 0:
        return
    db.add(Zrno(korisnik_id=korisnik_id, kurs_id=kurs_id, iznos=iznos, razlog=razlog, objekat=objekat, dan=danas(), u=sada()))
    db.flush()
    niz, _ = dani_zaredom(dani_sa_zrnima(db, korisnik_id, kurs_id), danas())
    if niz >= 3:
        dodeli_bedz(db, korisnik_id, kurs_id, "streak3", novi)


def ukupno_zrna(db: Session, korisnik_id: int, kurs_id: int) -> int:
    return db.scalar(
        select(func.coalesce(func.sum(Zrno.iznos), 0)).where(Zrno.korisnik_id == korisnik_id, Zrno.kurs_id == kurs_id)
    )


def nivoi_korisnika(db: Session, korisnik_id: int, kurs_id: int) -> dict[str, NivoKorisnika]:
    return {
        n.nivo: n
        for n in db.scalars(
            select(NivoKorisnika).where(NivoKorisnika.korisnik_id == korisnik_id, NivoKorisnika.kurs_id == kurs_id)
        )
    }
