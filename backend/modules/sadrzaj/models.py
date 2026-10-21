from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint, func, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models import Base, Json, UtcDateTime


class Kurs(Base):
    __tablename__ = "kursevi"

    id: Mapped[int] = mapped_column(primary_key=True)
    kljuc: Mapped[str] = mapped_column(String(40), unique=True)
    naziv: Mapped[str] = mapped_column(String(120))
    opis: Mapped[str | None] = mapped_column(Text)
    aktivan: Mapped[bool] = mapped_column(Boolean, server_default=true())
    redosled: Mapped[int] = mapped_column(Integer, server_default="0")
    # objavljena verzija; polaznici dobijaju nju
    verzija_id: Mapped[int | None] = mapped_column(
        ForeignKey("sadrzaj_verzije.id", ondelete="SET NULL", use_alter=True)
    )

    # kurs se otključava kad polaznik položi završni test ovog kursa (npr. srednji nivo posle osnovnog)
    preduslov_id: Mapped[int | None] = mapped_column(ForeignKey("kursevi.id", ondelete="SET NULL"))

    verzija: Mapped["SadrzajVerzija | None"] = relationship(foreign_keys=[verzija_id], post_update=True)
    preduslov: Mapped["Kurs | None"] = relationship(remote_side=[id], foreign_keys=[preduslov_id])


class SadrzajVerzija(Base):
    """Ceo kurs kao jedan JSON dokument. Objavljena verzija se ne menja; izmena pravi novu."""

    __tablename__ = "sadrzaj_verzije"
    __table_args__ = (UniqueConstraint("kurs_id", "broj", name="uq_sadrzaj_verzije_kurs_broj"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"), index=True)
    broj: Mapped[int] = mapped_column(Integer)
    dokument: Mapped[dict[str, Any]] = mapped_column(Json)
    # sha256 kanonskog JSON-a; isti dokument se ne uvozi dvaput
    otisak: Mapped[str] = mapped_column(String(64))
    napomena: Mapped[str | None] = mapped_column(String(400))
    kreirana_u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())
    objavljena_u: Mapped[datetime | None] = mapped_column(UtcDateTime())
    kreirao_id: Mapped[int | None] = mapped_column(ForeignKey("korisnici.id", ondelete="SET NULL"))


class Pitanje(Base):
    """Indeks izazova iz verzija kursa, za statistiku po pitanju i izvlačenje testa.

    Ključ je (kurs, id iz sadržaja): isto pitanje kroz verzije ostaje isti red, a tekst prati poslednju verziju.
    """

    __tablename__ = "pitanja"
    __table_args__ = (UniqueConstraint("kurs_id", "kljuc", name="uq_pitanja_kurs_kljuc"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"), index=True)
    kljuc: Mapped[str] = mapped_column(String(40))
    nivo: Mapped[str] = mapped_column(String(20))
    # mc, tf, num, order, match, sort, hotspot, game, swipe
    tip: Mapped[str] = mapped_column(String(20))
    # lekcija (korak nivoa), banka (dodatna pitanja za test), brza_runda
    gde: Mapped[str] = mapped_column(String(20))
    tekst: Mapped[str] = mapped_column(Text)
    # sme u završni test (mc, tf, num iz lekcije i banke)
    za_test: Mapped[bool] = mapped_column(Boolean)
    # nema ga u objavljenoj verziji; ostaje zbog istorije odgovora
    aktivno: Mapped[bool] = mapped_column(Boolean, server_default=true())
