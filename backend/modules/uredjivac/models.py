from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from core.models import Base, Json, UtcDateTime


class Nacrt(Base):
    """Neobjavljene izmene kursa. Jedan nacrt po kursu, zajednički za sve urednike; polaznici ga ne vide."""

    __tablename__ = "sadrzaj_nacrti"

    id: Mapped[int] = mapped_column(primary_key=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"), unique=True)
    dokument: Mapped[dict[str, Any]] = mapped_column(Json)
    # objavljena verzija od koje je nacrt krenuo; prazno za nov kurs koji još nije objavljen
    osnova_verzija_id: Mapped[int | None] = mapped_column(ForeignKey("sadrzaj_verzije.id", ondelete="CASCADE"))
    # raste sa svakim čuvanjem; čuvanje sa starom revizijom se odbija, da dva urednika ne pregaze jedan drugog
    revizija: Mapped[int] = mapped_column(Integer)
    izmenio_id: Mapped[int | None] = mapped_column(ForeignKey("korisnici.id", ondelete="SET NULL"))
    izmenjen_u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())
