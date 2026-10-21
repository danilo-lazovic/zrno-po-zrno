"""Nedeljna rang lista po lokalu (Modul 6c): zrna od ponedeljka do nedelje (Beograd), samo kolege iz istog lokala.

Polaznik vidi kolege koje su te nedelje zaradile bar jedno zrno, i sebe. Osoblje vidi ceo lokal
(i polaznike bez zrna), u granicama pristupa: menadžer samo svoje lokale.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.db import get_db
from core.deps import samo_osoblje, trenutni_korisnik
from core.models import Korisnik, Lokal, Uloga
from core.pristup import dozvoljeni_lokal_ids
from core.vreme import danas
from modules.napredak.models import Zrno
from modules.sadrzaj.kurs import objavljen_kurs

router = APIRouter(prefix="/api")


class Red(BaseModel):
    korisnik_id: int
    ime: str
    avatar: str | None
    zrna: int
    # isti broj zrna, isto mesto (1, 1, 3)
    mesto: int
    ja: bool = False


class RangOut(BaseModel):
    lokal: str | None
    pocetak: date
    kraj: date
    redovi: list[Red]
    # polaznika u lokalu (sa postavljenim PIN-om), i onih koji te nedelje nemaju zrna
    polaznika: int


class RangLokalaOut(RangOut):
    lokal_id: int


def nedelja(dan: date, pomak: int = 0) -> tuple[date, date]:
    """Ponedeljak i nedelja nedelje u kojoj je dan; pomak -1 je prošla nedelja."""
    pon = dan - timedelta(days=dan.weekday()) + timedelta(weeks=pomak)
    return pon, pon + timedelta(days=6)


def rang_lokala(db: Session, kurs_id: int, lokal_id: int, pocetak: date, kraj: date, puno_ime: bool = False) -> list[Red]:
    zrna = (
        select(Zrno.korisnik_id, func.sum(Zrno.iznos).label("zrna"))
        .where(Zrno.kurs_id == kurs_id, Zrno.dan >= pocetak, Zrno.dan <= kraj)
        .group_by(Zrno.korisnik_id)
        .subquery()
    )
    upit = (
        select(Korisnik, func.coalesce(zrna.c.zrna, 0))
        .outerjoin(zrna, zrna.c.korisnik_id == Korisnik.id)
        .where(Korisnik.uloga == Uloga.polaznik, Korisnik.aktivan.is_(True), Korisnik.pin_hash.is_not(None),
               Korisnik.lokal_id == lokal_id)
        .order_by(func.coalesce(zrna.c.zrna, 0).desc(), Korisnik.ime, Korisnik.prezime)
    )
    redovi: list[Red] = []
    for i, (k, z) in enumerate(db.execute(upit)):
        mesto = redovi[-1].mesto if redovi and redovi[-1].zrna == z else i + 1
        # kolege se znaju po imenu, pa polaznik vidi samo inicijal prezimena; osoblje vidi celo ime
        ime = f"{k.ime} {k.prezime}" if puno_ime else f"{k.ime} {k.prezime[:1]}."
        redovi.append(Red(korisnik_id=k.id, ime=ime, avatar=k.avatar, zrna=int(z), mesto=mesto))
    return redovi


@router.get("/rang/{kurs}", response_model=RangOut)
def moj_rang(kurs: str, pomak: int = Query(default=0, ge=-1, le=0), korisnik: Korisnik = Depends(trenutni_korisnik),
             db: Session = Depends(get_db)):
    pocetak, kraj = nedelja(danas(), pomak)
    if korisnik.lokal_id is None:
        return RangOut(lokal=None, pocetak=pocetak, kraj=kraj, redovi=[], polaznika=0)
    redovi = rang_lokala(db, objavljen_kurs(db, kurs).id, korisnik.lokal_id, pocetak, kraj)
    for r in redovi:
        r.ja = r.korisnik_id == korisnik.id
    vidljivi = [r for r in redovi if r.zrna > 0 or r.ja]
    return RangOut(lokal=korisnik.lokal.naziv, pocetak=pocetak, kraj=kraj, redovi=vidljivi, polaznika=len(redovi))


@router.get("/admin/rang/{kurs}", response_model=list[RangLokalaOut])
def rang_osoblje(kurs: str, pomak: int = Query(default=0, ge=-12, le=0), lokal_id: int | None = None,
                 korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    pocetak, kraj = nedelja(danas(), pomak)
    dozvoljeni = dozvoljeni_lokal_ids(korisnik)
    upit = select(Lokal).where(Lokal.aktivan.is_(True)).order_by(Lokal.naziv)
    if lokal_id is not None:
        if dozvoljeni is not None and lokal_id not in dozvoljeni:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Nemaš pristup ovom lokalu.")
        upit = select(Lokal).where(Lokal.id == lokal_id)
    elif dozvoljeni is not None:
        upit = upit.where(Lokal.id.in_(dozvoljeni or [0]))
    kid = objavljen_kurs(db, kurs).id
    out = []
    for lokal in db.scalars(upit):
        redovi = rang_lokala(db, kid, lokal.id, pocetak, kraj, puno_ime=True)
        out.append(RangLokalaOut(lokal_id=lokal.id, lokal=lokal.naziv, pocetak=pocetak, kraj=kraj, redovi=redovi, polaznika=len(redovi)))
    return out
