from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.igre.models import RezultatIgre


class IgraStanje(BaseModel):
    # poeni za Brzu rundu, procenat za ostale (kao u artifactu)
    najbolje: int
    zvezdice: int
    igranja: int


def merilo(igra: str, poeni: int, rezultat: float) -> int:
    return poeni if igra == "swipe" else round(rezultat * 100)


def stanje_igara(db: Session, korisnik_id: int, kurs_id: int) -> dict[str, IgraStanje]:
    stanje: dict[str, IgraStanje] = {}
    for r in db.scalars(
        select(RezultatIgre).where(RezultatIgre.korisnik_id == korisnik_id, RezultatIgre.kurs_id == kurs_id)
    ):
        s = stanje.setdefault(r.igra, IgraStanje(najbolje=0, zvezdice=0, igranja=0))
        s.najbolje = max(s.najbolje, merilo(r.igra, r.poeni, r.rezultat))
        s.zvezdice = max(s.zvezdice, r.zvezdice)
        s.igranja += 1
    return stanje
