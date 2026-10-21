from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    TypeDecorator,
    func,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# JSONB na Postgresu, običan JSON nad SQLite-om u testovima
Json = JSON().with_variant(JSONB(), "postgresql")


class UtcDateTime(TypeDecorator):
    """timestamptz koji se uvek čita kao UTC-aware datetime (i nad SQLite-om u testovima)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            raise ValueError("Naivan datetime; u bazu ide samo vreme sa zonom")
        return value.astimezone(UTC) if value is not None else None

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


class Uloga(StrEnum):
    admin = "admin"
    trener = "trener"
    menadzer = "menadzer"
    polaznik = "polaznik"


OSOBLJE = (Uloga.admin, Uloga.trener, Uloga.menadzer)


korisnik_lokal = Table(
    "korisnik_lokal",
    Base.metadata,
    Column("korisnik_id", ForeignKey("korisnici.id", ondelete="CASCADE"), primary_key=True),
    Column("lokal_id", ForeignKey("lokali.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class Lokal(Base):
    __tablename__ = "lokali"

    id: Mapped[int] = mapped_column(primary_key=True)
    naziv: Mapped[str] = mapped_column(String(120), unique=True)
    grad: Mapped[str | None] = mapped_column(String(80))
    format: Mapped[str | None] = mapped_column(String(30))
    aktivan: Mapped[bool] = mapped_column(Boolean, server_default=true())
    # portal (preuzet iz Kafeterija Portala, menja se samo tamo), rucno ili demo
    izvor: Mapped[str] = mapped_column(String(20), server_default="rucno")
    # id lokala u portalu; po njemu se lokal ažurira pri sledećem preuzimanju
    portal_id: Mapped[int | None] = mapped_column(Integer, unique=True)


class Korisnik(Base):
    __tablename__ = "korisnici"
    __table_args__ = (
        CheckConstraint("uloga IN ('admin', 'trener', 'menadzer', 'polaznik')", name="uloga"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ime: Mapped[str] = mapped_column(String(80))
    prezime: Mapped[str] = mapped_column(String(80))
    # polaznik se prijavljuje njime; osoblju je jednako emailu
    korisnicko_ime: Mapped[str] = mapped_column(String(254), unique=True)
    email: Mapped[str | None] = mapped_column(String(254), unique=True)
    uloga: Mapped[str] = mapped_column(String(20), index=True)
    # lokal u kom polaznik radi (menadžer ima listu u korisnik_lokal)
    lokal_id: Mapped[int | None] = mapped_column(ForeignKey("lokali.id", ondelete="SET NULL"), index=True)
    lozinka_hash: Mapped[str | None] = mapped_column(String(255))
    pin_hash: Mapped[str | None] = mapped_column(String(255))
    neuspeli_pin: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    zakljucan: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    aktivan: Mapped[bool] = mapped_column(Boolean, server_default=true())
    # prijave otvorene pre ovog trenutka više ne važe (nova pozivnica, nova lozinka, isključenje)
    sesije_od: Mapped[datetime | None] = mapped_column(UtcDateTime())
    poslednja_prijava: Mapped[datetime | None] = mapped_column(UtcDateTime())
    kreiran_u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())
    kreirao_id: Mapped[int | None] = mapped_column(ForeignKey("korisnici.id", ondelete="SET NULL"))
    # izbor polaznika u aplikaciji (zrno, tresnja, soljica...); None dok ne prođe uvod
    avatar: Mapped[str | None] = mapped_column(String(20))

    lokal: Mapped[Lokal | None] = relationship(foreign_keys=[lokal_id])
    lokali: Mapped[list[Lokal]] = relationship(secondary=korisnik_lokal, order_by=Lokal.naziv)

    @property
    def je_polaznik(self) -> bool:
        return self.uloga == Uloga.polaznik

    @property
    def puno_ime(self) -> str:
        return f"{self.ime} {self.prezime}".strip()


class Pozivnica(Base):
    """Jednokratni link kojim polaznik postavlja PIN. Čuva se samo otisak tokena."""

    __tablename__ = "pozivnice"

    id: Mapped[int] = mapped_column(primary_key=True)
    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), index=True)
    otisak: Mapped[str] = mapped_column(String(64), unique=True)
    istice_u: Mapped[datetime] = mapped_column(UtcDateTime())
    iskoriscena_u: Mapped[datetime | None] = mapped_column(UtcDateTime())
    # nova pozivnica poništava staru
    ponistena_u: Mapped[datetime | None] = mapped_column(UtcDateTime())
    kreirao_id: Mapped[int | None] = mapped_column(ForeignKey("korisnici.id", ondelete="SET NULL"))
    kreirana_u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())

    korisnik: Mapped[Korisnik] = relationship(foreign_keys=[korisnik_id])


class AuditLog(Base):
    """Akcije koje menjaju pristup ili sadržaj. Samo upis, bez izmena i brisanja."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True)
    korisnik_id: Mapped[int | None] = mapped_column(ForeignKey("korisnici.id", ondelete="SET NULL"), index=True)
    # ko je to uradio, čitljivo i kad nalog bude obrisan
    korisnik_naziv: Mapped[str | None] = mapped_column(String(254))
    kada: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now(), index=True)
    akcija: Mapped[str] = mapped_column(String(60), index=True)
    objekat: Mapped[str | None] = mapped_column(String(120))
    detalji: Mapped[dict[str, Any]] = mapped_column(Json, default=dict)
