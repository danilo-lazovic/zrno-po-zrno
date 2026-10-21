from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.models import Korisnik
from modules.sadrzaj.models import Kurs
from modules.test.models import Sertifikat


def objavljen_kurs(db: Session, kljuc: str) -> Kurs:
    """Aktivan kurs sa objavljenom verzijom, ili 404."""
    k = db.scalar(select(Kurs).where(Kurs.kljuc == kljuc, Kurs.aktivan.is_(True)))
    if k is None or k.verzija is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kurs ne postoji ili još nije objavljen.")
    return k


def otkljucan(db: Session, korisnik: Korisnik, k: Kurs) -> bool:
    """Kurs sa preduslovom se otključava važećim sertifikatom tog kursa; osoblje vidi sve."""
    if k.preduslov_id is None or not korisnik.je_polaznik:
        return True
    return db.scalar(
        select(Sertifikat.id).where(
            Sertifikat.korisnik_id == korisnik.id, Sertifikat.kurs_id == k.preduslov_id, Sertifikat.opozvan_u.is_(None)
        )
    ) is not None


def kurs_za_ucenje(db: Session, korisnik: Korisnik, kljuc: str) -> Kurs:
    """Objavljen kurs koji je polazniku otključan (lekcije i test), ili 404/403."""
    k = objavljen_kurs(db, kljuc)
    if not otkljucan(db, korisnik, k):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Kurs se otključava kad položiš završni test kursa „{k.preduslov.naziv}”.")
    return k
