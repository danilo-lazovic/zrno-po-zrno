from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from core.models import Base, Json, UtcDateTime


class RezultatIgre(Base):
    """Jedna odigrana igra, po ugovoru igre (PROJECT_CONTEXT, "Igre i Unity"): isti red za JS i Unity verziju."""

    __tablename__ = "igre_rezultati"

    id: Mapped[int] = mapped_column(primary_key=True)
    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), index=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"))
    igra: Mapped[str] = mapped_column(String(20))
    # js (canvas), 3d (three.js) ili unity, radi poređenja implementacija
    izvor: Mapped[str] = mapped_column(String(10))
    # igraonica (donosi zrna) ili lekcija (zrna idu kroz odgovor u lekciji)
    kontekst: Mapped[str] = mapped_column(String(20))
    rezultat: Mapped[float] = mapped_column(Float)
    zvezdice: Mapped[int] = mapped_column(Integer)
    poeni: Mapped[int] = mapped_column(Integer)
    trajanje_ms: Mapped[int] = mapped_column(Integer)
    detalji: Mapped[dict[str, Any]] = mapped_column(Json, default=dict)
    zrna: Mapped[int] = mapped_column(Integer)
    # kalendarski dan u Beogradu (dnevna granica za zrna iz igara)
    dan: Mapped[date] = mapped_column(Date)
    u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())
