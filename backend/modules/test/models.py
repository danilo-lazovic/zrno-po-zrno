from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models import Base, Json, Korisnik, UtcDateTime


class Test(Base):
    """Jedan pokušaj završnog testa. Pitanja izvlači server; bez kraja: prekinut."""

    __tablename__ = "testovi"

    id: Mapped[int] = mapped_column(primary_key=True)
    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), index=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"))
    verzija_id: Mapped[int] = mapped_column(ForeignKey("sadrzaj_verzije.id", ondelete="CASCADE"))
    # id-jevi izvučenih pitanja, redom kojim se postavljaju
    pitanja: Mapped[list[str]] = mapped_column(Json)
    pocetak: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())
    kraj: Mapped[datetime | None] = mapped_column(UtcDateTime())
    procenat: Mapped[int | None] = mapped_column(Integer)
    polozen: Mapped[bool | None] = mapped_column(Boolean)
    # tačnost po nivou (0–1), za "ponovi ove nivoe" i statistiku
    po_nivoima: Mapped[dict[str, Any] | None] = mapped_column(Json)


class Sertifikat(Base):
    """Jedan po polazniku i kursu. Bolji položen test menja rezultat, kod ostaje isti."""

    __tablename__ = "sertifikati"
    __table_args__ = (UniqueConstraint("korisnik_id", "kurs_id", name="uq_sertifikati_korisnik_kurs"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), index=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"))
    test_id: Mapped[int] = mapped_column(ForeignKey("testovi.id", ondelete="CASCADE"))
    kod: Mapped[str] = mapped_column(String(16), unique=True)
    procenat: Mapped[int] = mapped_column(Integer)
    izdat_u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())
    opozvan_u: Mapped[datetime | None] = mapped_column(UtcDateTime())
    opozvao_id: Mapped[int | None] = mapped_column(ForeignKey("korisnici.id", ondelete="SET NULL"))
    razlog_opoziva: Mapped[str | None] = mapped_column(String(300))

    korisnik: Mapped[Korisnik] = relationship(foreign_keys=[korisnik_id])
    kurs: Mapped["Kurs"] = relationship(foreign_keys=[kurs_id])  # noqa: F821  (modules.sadrzaj.models)
