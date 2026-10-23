"""Rezultati igara po ugovoru igre: isti API za JS i Unity verziju.

Igra vrati { igra_id, rezultat (0–1), zvezdice (0–3), poeni, trajanje_ms, detalji }, aplikacija ga pošalje ovde,
a server dodeli zrna i bedževe (pravila iz artifacta, app.js recordGame).
"""

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.db import get_db
from core.deps import trenutni_korisnik
from core.models import Korisnik
from core.vreme import danas, sada
from modules.igre.models import RezultatIgre
from modules.igre.stanje import merilo, stanje_igara
from modules.napredak import bodovanje as b
from modules.sadrzaj.kurs import objavljen_kurs

router = APIRouter(prefix="/api/igre")

# Igraonica daje zrna za prvih nekoliko igranja iste igre u danu; posle toga se igra za rekord i bedževe.
# Artifact nije imao granicu, pa se kratka igra (Brza runda, 60 s) mogla vrteti radi zrna.
IGRANJA_SA_ZRNIMA_DNEVNO = 5


class RezultatIn(BaseModel):
    igra_id: str = Field(min_length=1, max_length=20)
    rezultat: float = Field(ge=0, le=1)
    zvezdice: int = Field(ge=0, le=3)
    poeni: int = Field(ge=0, le=10_000)
    trajanje_ms: int = Field(ge=0, le=3_600_000)
    detalji: dict[str, Any] = {}
    izvor: Literal["js", "unity"] = "js"
    kontekst: Literal["igraonica", "lekcija"] = "igraonica"

    @field_validator("detalji")
    @classmethod
    def _mali_detalji(cls, v: dict[str, Any]) -> dict[str, Any]:
        if len(str(v)) > 2000:
            raise ValueError("detalji su preveliki")
        return v


class RezultatOut(BaseModel):
    zrna: int
    ukupno_zrna: int
    novi_bedzevi: list[str]
    zvezdice: int
    najbolje: int
    rekord: bool


def zvezdice_za(rezultat: float) -> int:
    """Pragovi iz artifacta (games.js starsFor), isti kao u frontend/src/igre/ugovor.ts."""
    return 3 if rezultat >= 0.9 else 2 if rezultat >= 0.7 else 1 if rezultat >= 0.4 else 0


def _bedzevi(db: Session, uid: int, kid: int, body: RezultatIn, zvezdice: int, novi: list[str]) -> None:
    igra = body.igra_id
    if igra == "swipe" and body.poeni >= 15:
        b.dodeli_bedz(db, uid, kid, "swipe", novi)
    if igra == "milk" and zvezdice == 3:
        b.dodeli_bedz(db, uid, kid, "milk", novi)
    if igra == "latte" and zvezdice == 3:
        b.dodeli_bedz(db, uid, kid, "latte", novi)
    if igra == "smena" and zvezdice == 3:
        b.dodeli_bedz(db, uid, kid, "smena", novi)
    if igra == "dialin" and body.rezultat > 0.2:
        b.dodeli_bedz(db, uid, kid, "dial", novi)
    if igra == "recipe":
        savrsenih = sum(
            int(d.get("perfect", 0) or 0)
            for d in db.scalars(
                select(RezultatIgre.detalji).where(
                    RezultatIgre.korisnik_id == uid, RezultatIgre.kurs_id == kid, RezultatIgre.igra == "recipe"
                )
            )
        )
        if savrsenih >= 3:
            b.dodeli_bedz(db, uid, kid, "recipe", novi)


@router.post("/{kurs}/rezultat", response_model=RezultatOut)
def rezultat(kurs: str, body: RezultatIn, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    k = objavljen_kurs(db, kurs)
    igra = next((g for g in k.verzija.dokument["igre"] if g["id"] == body.igra_id), None)
    if igra is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Igra ne postoji.")
    zavrseni = b.nivoi_korisnika(db, korisnik.id, k.id)
    if body.kontekst == "igraonica" and igra["after"] not in zavrseni:
        nivo = next(n for n in k.verzija.dokument["nivoi"] if n["id"] == igra["after"])
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Igra se otključava posle nivoa {nivo['n']}.")

    # zvezdice računa server iz rezultata, da JS i Unity verzija ne mogu da se razilaze
    zvezdice = zvezdice_za(body.rezultat)
    pre = stanje_igara(db, korisnik.id, k.id).get(body.igra_id)
    zrna = 0
    if body.kontekst == "igraonica":
        danas_igranja = db.scalar(
            select(func.count()).select_from(RezultatIgre).where(
                RezultatIgre.korisnik_id == korisnik.id,
                RezultatIgre.kurs_id == k.id,
                RezultatIgre.igra == body.igra_id,
                RezultatIgre.kontekst == "igraonica",
                RezultatIgre.zrna > 0,
                RezultatIgre.dan == danas(),
            )
        )
        if danas_igranja < IGRANJA_SA_ZRNIMA_DNEVNO:
            zrna = round(5 + body.rezultat * 15)

    db.add(
        RezultatIgre(
            korisnik_id=korisnik.id, kurs_id=k.id, igra=body.igra_id, izvor=body.izvor, kontekst=body.kontekst,
            rezultat=body.rezultat, zvezdice=zvezdice, poeni=body.poeni, trajanje_ms=body.trajanje_ms,
            detalji=body.detalji, zrna=zrna, dan=danas(), u=sada(),
        )
    )
    db.flush()
    novi: list[str] = []
    _bedzevi(db, korisnik.id, k.id, body, zvezdice, novi)
    b.dodaj_zrna(db, korisnik.id, k.id, zrna, "igra", body.igra_id, novi)
    db.commit()

    sada_merilo = merilo(body.igra_id, body.poeni, body.rezultat)
    return RezultatOut(
        zrna=zrna,
        ukupno_zrna=b.ukupno_zrna(db, korisnik.id, k.id),
        novi_bedzevi=novi,
        zvezdice=zvezdice,
        najbolje=max(sada_merilo, pre.najbolje if pre else 0),
        rekord=pre is not None and sada_merilo > pre.najbolje,
    )
