from datetime import date, datetime

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column

from core.models import Base, UtcDateTime


class ProlazNivoa(Base):
    """Jedan prolazak kroz nivo. Bez kraja: prekinut ili u toku (zrna od odgovora ostaju)."""

    __tablename__ = "prolazi_nivoa"

    id: Mapped[int] = mapped_column(primary_key=True)
    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), index=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"))
    verzija_id: Mapped[int] = mapped_column(ForeignKey("sadrzaj_verzije.id", ondelete="CASCADE"))
    nivo: Mapped[str] = mapped_column(String(20))
    pocetak: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())
    kraj: Mapped[datetime | None] = mapped_column(UtcDateTime())
    # zbir delimičnih rezultata (0–1 po izazovu) i broj izazova
    poeni: Mapped[float] = mapped_column(Float, server_default=text("0"))
    izazova: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    greske: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    # tačni zaredom u ovom prolazu (bonus zrna, bedž "Niz od 5")
    niz: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    zrna: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    zvezdice: Mapped[int | None] = mapped_column(Integer)


class Odgovor(Base):
    """Odgovor na izazov; osnova za statistiku po pitanju. Ključ pitanja je id iz sadržaja (m3.k07)."""

    __tablename__ = "odgovori"
    __table_args__ = (
        UniqueConstraint("prolaz_id", "pitanje", name="uq_odgovori_prolaz_pitanje"),
        UniqueConstraint("test_id", "pitanje", name="uq_odgovori_test_pitanje"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), index=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"))
    verzija_id: Mapped[int] = mapped_column(ForeignKey("sadrzaj_verzije.id", ondelete="CASCADE"))
    pitanje: Mapped[str] = mapped_column(String(40), index=True)
    nivo: Mapped[str] = mapped_column(String(20))
    # lekcija ili test
    kontekst: Mapped[str] = mapped_column(String(20))
    prolaz_id: Mapped[int | None] = mapped_column(ForeignKey("prolazi_nivoa.id", ondelete="CASCADE"), index=True)
    test_id: Mapped[int | None] = mapped_column(ForeignKey("testovi.id", ondelete="CASCADE"), index=True)
    rezultat: Mapped[float] = mapped_column(Float)
    vreme_ms: Mapped[int | None] = mapped_column(Integer)
    u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())


class Zrno(Base):
    """Knjiga zrna: svaki dobitak je red. Zbir je XP; dnevni cilj i dani zaredom se računaju iz `dan`."""

    __tablename__ = "zrna"

    id: Mapped[int] = mapped_column(primary_key=True)
    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), index=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"))
    iznos: Mapped[int] = mapped_column(Integer)
    # odgovor, nivo, kartica, igra, test
    razlog: Mapped[str] = mapped_column(String(20))
    objekat: Mapped[str | None] = mapped_column(String(60))
    # kalendarski dan u Beogradu
    dan: Mapped[date] = mapped_column(Date, index=True)
    u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())


class NivoKorisnika(Base):
    """Najbolji ishod po nivou (zbirno, da staza ne čita sve prolaze)."""

    __tablename__ = "nivoi_korisnika"

    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), primary_key=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"), primary_key=True)
    nivo: Mapped[str] = mapped_column(String(20), primary_key=True)
    zavrsen_u: Mapped[datetime] = mapped_column(UtcDateTime())
    zvezdice: Mapped[int] = mapped_column(Integer)
    # najbolja tačnost u procentima
    najbolje: Mapped[int] = mapped_column(Integer)
    prolazaka: Mapped[int] = mapped_column(Integer)


class BedzKorisnika(Base):
    __tablename__ = "bedzevi_korisnika"

    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), primary_key=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"), primary_key=True)
    bedz: Mapped[str] = mapped_column(String(20), primary_key=True)
    u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())


class KarticaKorisnika(Base):
    """Pojam iz rečnika koji polaznik zna. Zrno se dobija samo prvi put, da se kartice ne vrte radi zrna."""

    __tablename__ = "kartice_korisnika"

    korisnik_id: Mapped[int] = mapped_column(ForeignKey("korisnici.id", ondelete="CASCADE"), primary_key=True)
    kurs_id: Mapped[int] = mapped_column(ForeignKey("kursevi.id", ondelete="CASCADE"), primary_key=True)
    pojam: Mapped[str] = mapped_column(String(60), primary_key=True)
    zna: Mapped[bool] = mapped_column(Boolean)
    nagradjena: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    u: Mapped[datetime] = mapped_column(UtcDateTime(), server_default=func.now())
