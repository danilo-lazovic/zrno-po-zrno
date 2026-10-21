"""Napredak polaznika: prolazi kroz nivoe, odgovori, zrna, dani zaredom, bedževi, kartice.

Klijent javlja šta je polaznik uradio (rezultat izazova 0–1), a server računa zrna, zvezdice i bedževe
po pravilima iz bodovanje.py.
"""

from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.db import get_db
from core.deps import trenutni_korisnik
from core.models import Korisnik
from core.vreme import danas, sada, vreme_od
from modules.napredak import bodovanje as b
from modules.napredak.models import BedzKorisnika, KarticaKorisnika, NivoKorisnika, Odgovor, ProlazNivoa, Zrno
from modules.igre.stanje import IgraStanje, stanje_igara
from modules.sadrzaj.kurs import kurs_za_ucenje, objavljen_kurs
from modules.sadrzaj.models import SadrzajVerzija
from modules.sadrzaj.uvoz import IZAZOVI
from modules.test.router import stanje_testa

router = APIRouter(prefix="/api/napredak")


# ---------- šeme ----------


class NivoStanje(BaseModel):
    zavrsen: bool
    zvezdice: int
    najbolje: int


class TestStanje(BaseModel):
    najbolje: int
    polozen: bool


class Nedovrsen(BaseModel):
    nivo: str
    odgovoreno: int
    pocetak: datetime


class NapredakOut(BaseModel):
    zrna: int
    danas_zrna: int
    niz_dana: int
    najduzi_niz: int
    nivoi: dict[str, NivoStanje]
    bedzevi: list[str]
    kartice: dict[str, bool]
    igre: dict[str, IgraStanje]
    test: TestStanje
    # za podsetnike u aplikaciji: poslednji dan sa zrnima i nivo započet a nezavršen (poslednjih 7 dana)
    poslednji_dan: date | None
    nedovrsen: Nedovrsen | None


class ProlazOut(BaseModel):
    prolaz_id: int


class OdgovorIn(BaseModel):
    pitanje: str = Field(min_length=1, max_length=40)
    rezultat: float = Field(ge=0, le=1)
    vreme_ms: int | None = Field(default=None, ge=0, le=3_600_000)
    # mc: indeks izabranog ponuđenog odgovora, tf: true/false, num: broj (za statistiku pogrešnih odgovora)
    izbor: bool | int | float | None = None


class OdgovorOut(BaseModel):
    zrna: int
    niz: int
    ukupno_zrna: int
    novi_bedzevi: list[str]


class ZavrsetakOut(BaseModel):
    tacnost: int
    zvezdice: int
    bonus: int
    zrna_prolaz: int
    ukupno_zrna: int
    niz_dana: int
    novi_bedzevi: list[str]


class KarticaIn(BaseModel):
    zna: bool


class KarticaOut(BaseModel):
    zrna: int
    ukupno_zrna: int
    novi_bedzevi: list[str]


# ---------- pomoćne ----------


def _nivoi(dok: dict[str, Any]) -> list[dict[str, Any]]:
    return dok["nivoi"]


def _izazovi(nivo: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {k["id"]: k for k in nivo["steps"] if k["t"] in IZAZOVI}


def _prolaz(db: Session, korisnik: Korisnik, prolaz_id: int) -> ProlazNivoa:
    p = db.get(ProlazNivoa, prolaz_id)
    if p is None or p.korisnik_id != korisnik.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prolaz ne postoji.")
    if p.kraj is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Nivo je već završen u ovom prolazu.")
    return p


def _nivo_iz_verzije(db: Session, p: ProlazNivoa) -> tuple[list[dict[str, Any]], int]:
    nivoi = _nivoi(db.get(SadrzajVerzija, p.verzija_id).dokument)
    i = next(i for i, n in enumerate(nivoi) if n["id"] == p.nivo)
    return nivoi, i


# ---------- API ----------


@router.get("/{kurs}", response_model=NapredakOut)
def napredak(kurs: str, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    k = objavljen_kurs(db, kurs)
    kid, uid = k.id, korisnik.id
    dani = b.dani_sa_zrnima(db, uid, kid)
    niz, najduzi = b.dani_zaredom(dani, danas())
    zavrseni = b.nivoi_korisnika(db, uid, kid)
    p = db.scalar(
        select(ProlazNivoa)
        .where(ProlazNivoa.korisnik_id == uid, ProlazNivoa.kurs_id == kid, ProlazNivoa.kraj.is_(None),
               ProlazNivoa.pocetak >= sada() - timedelta(days=7), ProlazNivoa.nivo.not_in(zavrseni or [""]))
        .order_by(ProlazNivoa.pocetak.desc())
        .limit(1)
    )
    _, najbolje_test, polozen_test = stanje_testa(db, uid, kid)
    danas_zrna = db.scalar(
        select(func.coalesce(func.sum(Zrno.iznos), 0)).where(Zrno.korisnik_id == uid, Zrno.kurs_id == kid, Zrno.dan == danas())
    )
    return NapredakOut(
        zrna=b.ukupno_zrna(db, uid, kid),
        danas_zrna=danas_zrna,
        niz_dana=niz,
        najduzi_niz=najduzi,
        nivoi={
            n.nivo: NivoStanje(zavrsen=True, zvezdice=n.zvezdice, najbolje=n.najbolje)
            for n in zavrseni.values()
        },
        bedzevi=list(
            db.scalars(
                select(BedzKorisnika.bedz)
                .where(BedzKorisnika.korisnik_id == uid, BedzKorisnika.kurs_id == kid)
                .order_by(BedzKorisnika.u)
            )
        ),
        kartice={
            c.pojam: c.zna
            for c in db.scalars(
                select(KarticaKorisnika).where(KarticaKorisnika.korisnik_id == uid, KarticaKorisnika.kurs_id == kid)
            )
        },
        igre=stanje_igara(db, uid, kid),
        test=TestStanje(najbolje=najbolje_test, polozen=polozen_test),
        poslednji_dan=max(dani) if dani else None,
        nedovrsen=Nedovrsen(nivo=p.nivo, odgovoreno=p.izazova, pocetak=p.pocetak) if p else None,
    )


def _zapocni(db: Session, korisnik: Korisnik, kurs: str, nivo: str) -> ProlazNivoa:
    k = kurs_za_ucenje(db, korisnik, kurs)
    nivoi = _nivoi(k.verzija.dokument)
    i = next((i for i, n in enumerate(nivoi) if n["id"] == nivo), None)
    if i is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nivo ne postoji.")
    if i > 0 and nivoi[i - 1]["id"] not in b.nivoi_korisnika(db, korisnik.id, k.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Prvo završi nivo {nivoi[i - 1]['n']}.")
    p = ProlazNivoa(korisnik_id=korisnik.id, kurs_id=k.id, verzija_id=k.verzija_id, nivo=nivo, pocetak=sada(),
                    poeni=0, izazova=0, greske=0, niz=0, zrna=0)
    db.add(p)
    db.flush()
    return p


def _odgovor(db: Session, korisnik: Korisnik, p: ProlazNivoa, body: OdgovorIn) -> OdgovorOut:
    zrna, p.niz, greska = b.zrna_za_odgovor(body.rezultat, p.niz)
    p.poeni += body.rezultat
    p.izazova += 1
    p.greske += int(greska)
    p.zrna += zrna
    db.add(Odgovor(korisnik_id=korisnik.id, kurs_id=p.kurs_id, verzija_id=p.verzija_id, pitanje=body.pitanje, nivo=p.nivo,
                   kontekst="lekcija", prolaz_id=p.id, rezultat=body.rezultat, izbor=body.izbor, vreme_ms=body.vreme_ms, u=sada()))
    novi: list[str] = []
    if p.niz >= 5:
        b.dodeli_bedz(db, korisnik.id, p.kurs_id, "combo5", novi)
    b.dodaj_zrna(db, korisnik.id, p.kurs_id, zrna, "odgovor", body.pitanje, novi)
    return OdgovorOut(zrna=zrna, niz=p.niz, ukupno_zrna=b.ukupno_zrna(db, korisnik.id, p.kurs_id), novi_bedzevi=novi)


def _odgovoreno(db: Session, p: ProlazNivoa, pitanje: str) -> bool:
    return db.scalar(select(Odgovor.id).where(Odgovor.prolaz_id == p.id, Odgovor.pitanje == pitanje)) is not None


def _zavrsi(db: Session, korisnik: Korisnik, p: ProlazNivoa) -> ZavrsetakOut:
    nivoi, i = _nivo_iz_verzije(db, p)
    if p.izazova < len(_izazovi(nivoi[i])):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Nisu odgovoreni svi izazovi u nivou.")

    tacnost = p.poeni / p.izazova if p.izazova else 1.0
    zvezdice = b.zvezdice_za(tacnost)
    stari = b.nivoi_korisnika(db, korisnik.id, p.kurs_id)
    prvi_put = p.nivo not in stari
    bonus = b.bonus_za_nivo(p.greske, prvi_put)
    procenat = round(tacnost * 100)

    if prvi_put:
        db.add(NivoKorisnika(korisnik_id=korisnik.id, kurs_id=p.kurs_id, nivo=p.nivo, zavrsen_u=sada(),
                             zvezdice=zvezdice, najbolje=procenat, prolazaka=1))
    else:
        n = stari[p.nivo]
        n.zvezdice, n.najbolje, n.prolazaka = max(n.zvezdice, zvezdice), max(n.najbolje, procenat), n.prolazaka + 1
    p.kraj, p.zvezdice = sada(), zvezdice
    p.zrna += bonus

    novi: list[str] = []
    b.dodaj_zrna(db, korisnik.id, p.kurs_id, bonus, "nivo", p.nivo, novi)
    zavrseni = b.nivoi_korisnika(db, korisnik.id, p.kurs_id)
    if i == 0:
        b.dodeli_bedz(db, korisnik.id, p.kurs_id, "first", novi)
    if p.greske == 0:
        b.dodeli_bedz(db, korisnik.id, p.kurs_id, "perfect", novi)
    if len(zavrseni) >= 4:
        b.dodeli_bedz(db, korisnik.id, p.kurs_id, "half", novi)
    if all(n["id"] in zavrseni and zavrseni[n["id"]].zvezdice == 3 for n in nivoi):
        b.dodeli_bedz(db, korisnik.id, p.kurs_id, "allstars", novi)
    return ZavrsetakOut(tacnost=procenat, zvezdice=zvezdice, bonus=bonus, zrna_prolaz=p.zrna,
                        ukupno_zrna=b.ukupno_zrna(db, korisnik.id, p.kurs_id), niz_dana=0, novi_bedzevi=novi)


def _niz(db: Session, korisnik: Korisnik, kurs_id: int) -> int:
    return b.dani_zaredom(b.dani_sa_zrnima(db, korisnik.id, kurs_id), danas())[0]


@router.post("/{kurs}/nivoi/{nivo}/prolaz", response_model=ProlazOut, status_code=status.HTTP_201_CREATED)
def novi_prolaz(kurs: str, nivo: str, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    p = _zapocni(db, korisnik, kurs, nivo)
    db.commit()
    return ProlazOut(prolaz_id=p.id)


@router.post("/prolazi/{prolaz_id}/odgovor", response_model=OdgovorOut)
def odgovor(prolaz_id: int, body: OdgovorIn, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    p = _prolaz(db, korisnik, prolaz_id)
    nivoi, i = _nivo_iz_verzije(db, p)
    if body.pitanje not in _izazovi(nivoi[i]):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Taj izazov nije u ovom nivou.")
    if _odgovoreno(db, p, body.pitanje):
        raise HTTPException(status.HTTP_409_CONFLICT, "Na ovo pitanje je već odgovoreno.")
    out = _odgovor(db, korisnik, p, body)
    db.commit()
    return out


@router.post("/prolazi/{prolaz_id}/zavrsi", response_model=ZavrsetakOut)
def zavrsi(prolaz_id: int, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    p = _prolaz(db, korisnik, prolaz_id)
    out = _zavrsi(db, korisnik, p)
    db.commit()
    out.niz_dana = _niz(db, korisnik, p.kurs_id)
    return out


# ---------- nivo pređen bez mreže ----------

# koliko unazad važi vreme koje javi telefon (niz dana, dnevni cilj); starije se upisuje kao da je pređeno pre 3 dana
OFFLINE_DANA = 3


class SinhronizacijaIn(BaseModel):
    # telefon pravi ključ jednom po nivou; isti ključ poslat ponovo (izgubljen odgovor servera) ne upisuje nivo dvaput
    kljuc: str = Field(pattern=r"^[0-9a-f-]{36}$")
    # nivo započet sa mrežom pa prekinut: nastavlja se taj prolaz, već upisani odgovori se preskaču
    prolaz_id: int | None = None
    odgovori: list[OdgovorIn] = Field(max_length=200)
    zavrseno_u: datetime


def _sazetak(db: Session, korisnik: Korisnik, p: ProlazNivoa) -> ZavrsetakOut:
    return ZavrsetakOut(tacnost=round(p.poeni / p.izazova * 100) if p.izazova else 100, zvezdice=p.zvezdice or 0, bonus=0,
                        zrna_prolaz=p.zrna, ukupno_zrna=b.ukupno_zrna(db, korisnik.id, p.kurs_id),
                        niz_dana=_niz(db, korisnik, p.kurs_id), novi_bedzevi=[])


@router.post("/{kurs}/nivoi/{nivo}/sinhronizacija", response_model=ZavrsetakOut)
def sinhronizacija(kurs: str, nivo: str, body: SinhronizacijaIn, korisnik: Korisnik = Depends(trenutni_korisnik),
                   db: Session = Depends(get_db)):
    """Ceo nivo pređen bez mreže (ili završen kad je mreža pukla) u jednom zahtevu, sa vremenom kad je pređen."""
    vec = db.scalar(select(ProlazNivoa).where(ProlazNivoa.korisnik_id == korisnik.id, ProlazNivoa.kljuc == body.kljuc))
    if vec is not None and vec.kraj is not None:
        return _sazetak(db, korisnik, vec)

    kada = body.zavrseno_u if body.zavrseno_u.tzinfo else body.zavrseno_u.replace(tzinfo=UTC)
    sad = sada()
    kada = min(max(kada, sad - timedelta(days=OFFLINE_DANA)), sad)

    with vreme_od(kada):
        if body.prolaz_id is not None:
            p = db.get(ProlazNivoa, body.prolaz_id)
            if p is None or p.korisnik_id != korisnik.id or p.nivo != nivo or p.kurs_id != objavljen_kurs(db, kurs).id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Prolaz ne postoji.")
            if p.kraj is not None:
                # nivo je završen, ali odgovor servera nije stigao do telefona
                return _sazetak(db, korisnik, p)
        else:
            p = vec or _zapocni(db, korisnik, kurs, nivo)
        p.kljuc = body.kljuc
        nivoi, i = _nivo_iz_verzije(db, p)
        izazovi = _izazovi(nivoi[i])
        novi: list[str] = []
        for o in body.odgovori:
            # pitanje izbačeno u novoj verziji sadržaja ili već upisano pre prekida veze se preskače
            if o.pitanje in izazovi and not _odgovoreno(db, p, o.pitanje):
                novi += _odgovor(db, korisnik, p, o).novi_bedzevi
        out = _zavrsi(db, korisnik, p)
        db.commit()
    out.novi_bedzevi = novi + out.novi_bedzevi
    out.niz_dana = _niz(db, korisnik, p.kurs_id)
    return out


@router.post("/{kurs}/kartice/{pojam}", response_model=KarticaOut)
def kartica(kurs: str, pojam: str, body: KarticaIn, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    k = objavljen_kurs(db, kurs)
    if pojam not in {x["id"] for x in k.verzija.dokument["pojmovi"]}:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pojam ne postoji.")
    c = db.get(KarticaKorisnika, (korisnik.id, k.id, pojam))
    if c is None:
        c = KarticaKorisnika(korisnik_id=korisnik.id, kurs_id=k.id, pojam=pojam, nagradjena=False)
        db.add(c)
    c.zna, c.u = body.zna, sada()
    novi: list[str] = []
    zrna = 0
    if body.zna and not c.nagradjena:
        c.nagradjena, zrna = True, 1
        b.dodaj_zrna(db, korisnik.id, k.id, zrna, "kartica", pojam, novi)
    db.commit()
    return KarticaOut(zrna=zrna, ukupno_zrna=b.ukupno_zrna(db, korisnik.id, k.id), novi_bedzevi=novi)
