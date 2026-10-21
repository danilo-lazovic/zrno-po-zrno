from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.db import get_db
from core.deps import samo_osoblje, trenutni_korisnik
from core.models import Korisnik
from modules.napredak.models import NivoKorisnika
from modules.sadrzaj.kurs import otkljucan
from modules.sadrzaj.models import Kurs, Pitanje, SadrzajVerzija
from modules.sadrzaj.uvoz import za_polaznika
from modules.test.models import Sertifikat

router = APIRouter(prefix="/api")


class KursOut(BaseModel):
    kljuc: str
    naziv: str
    opis: str | None
    verzija: int | None
    nivoa: int
    # za polaznika: koliko je nivoa završio, da li je položio test i da li mu je kurs otključan
    zavrseno: int
    polozen: bool
    otkljucan: bool
    preduslov: str | None


class SadrzajOut(BaseModel):
    kurs: str
    verzija: int
    dokument: dict[str, Any]


class VerzijaOut(BaseModel):
    kurs: str
    broj: int
    objavljena: bool
    objavljena_u: datetime | None
    napomena: str | None
    nivoa: int
    izazova: int


@router.get("/kursevi", response_model=list[KursOut])
def kursevi(korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    """Objavljeni aktivni kursevi redom; zaključani se vide (da polaznik zna šta ga čeka), ali se ne mogu učiti."""
    upit = select(Kurs).where(Kurs.aktivan.is_(True), Kurs.verzija_id.isnot(None)).order_by(Kurs.redosled, Kurs.id)
    zavrseno = dict(
        db.execute(
            select(NivoKorisnika.kurs_id, func.count()).where(NivoKorisnika.korisnik_id == korisnik.id).group_by(NivoKorisnika.kurs_id)
        ).all()
    )
    polozeni = set(
        db.scalars(select(Sertifikat.kurs_id).where(Sertifikat.korisnik_id == korisnik.id, Sertifikat.opozvan_u.is_(None)))
    )
    return [
        KursOut(kljuc=k.kljuc, naziv=k.naziv, opis=k.opis, verzija=k.verzija.broj, nivoa=len(k.verzija.dokument["nivoi"]),
                zavrseno=zavrseno.get(k.id, 0), polozen=k.id in polozeni, otkljucan=otkljucan(db, korisnik, k),
                preduslov=k.preduslov.naziv if k.preduslov else None)
        for k in db.scalars(upit)
    ]


@router.get("/sadrzaj/{kurs}", response_model=SadrzajOut)
def sadrzaj(kurs: str, _: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    k = db.scalar(select(Kurs).where(Kurs.kljuc == kurs, Kurs.aktivan.is_(True)))
    if k is None or k.verzija is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kurs ne postoji ili još nije objavljen.")
    return SadrzajOut(kurs=k.kljuc, verzija=k.verzija.broj, dokument=za_polaznika(k.verzija.dokument))


@router.get("/admin/sadrzaj/verzije", response_model=list[VerzijaOut])
def verzije(_: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    izazova = dict(
        db.execute(select(Pitanje.kurs_id, func.count()).where(Pitanje.aktivno.is_(True)).group_by(Pitanje.kurs_id)).all()
    )
    redovi = db.execute(
        select(SadrzajVerzija, Kurs).join(Kurs, Kurs.id == SadrzajVerzija.kurs_id).order_by(Kurs.id, SadrzajVerzija.broj.desc())
    ).all()
    return [
        VerzijaOut(
            kurs=k.kljuc,
            broj=v.broj,
            objavljena=k.verzija_id == v.id,
            objavljena_u=v.objavljena_u,
            napomena=v.napomena,
            nivoa=len(v.dokument.get("nivoi", [])),
            # broj izazova važi za objavljenu verziju (indeks pitanja prati nju)
            izazova=izazova.get(k.id, 0) if k.verzija_id == v.id else 0,
        )
        for v, k in redovi
    ]
