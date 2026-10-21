from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.sadrzaj.models import Kurs


def objavljen_kurs(db: Session, kljuc: str) -> Kurs:
    """Aktivan kurs sa objavljenom verzijom, ili 404."""
    k = db.scalar(select(Kurs).where(Kurs.kljuc == kljuc, Kurs.aktivan.is_(True)))
    if k is None or k.verzija is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kurs ne postoji ili još nije objavljen.")
    return k
