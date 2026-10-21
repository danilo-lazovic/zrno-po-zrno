"""Admin deo: lokali, nalozi osoblja, polaznici i pozivnice."""

import re
import unicodedata
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from core.audit import Akcija, zapisi
from core.config import get_settings
from core.db import get_db
from core.deps import samo_admin, samo_osoblje
from core.models import OSOBLJE, Korisnik, Lokal, Pozivnica, Uloga
from core.pristup import dozvoljeni_lokal_ids, filtriraj_polaznike, sme_polaznika
from core.schemas import LokalOut
from core.security import MIN_LOZINKA, hash_tajne, novi_token_pozivnice
from core.vreme import sada
from modules.napredak.models import NivoKorisnika, Zrno
from modules.osoblje import portal
from modules.test.models import Test

router = APIRouter(prefix="/api/admin")


# ---------- lokali ----------


class LokalIn(BaseModel):
    naziv: str = Field(min_length=1, max_length=120)
    grad: str | None = Field(default=None, max_length=80)
    aktivan: bool = True


@router.get("/lokali", response_model=list[LokalOut])
def lokali(korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    upit = select(Lokal).order_by(Lokal.naziv)
    ids = dozvoljeni_lokal_ids(korisnik)
    if ids is not None:
        upit = upit.where(Lokal.id.in_(ids))
    return db.scalars(upit).all()


@router.post("/lokali", response_model=LokalOut, status_code=status.HTTP_201_CREATED)
def novi_lokal(body: LokalIn, admin: Korisnik = Depends(samo_admin), db: Session = Depends(get_db)):
    if db.scalar(select(Lokal).where(Lokal.naziv == body.naziv.strip())):
        raise HTTPException(status.HTTP_409_CONFLICT, "Lokal sa tim nazivom već postoji.")
    lokal = Lokal(naziv=body.naziv.strip(), grad=body.grad, aktivan=body.aktivan, izvor="rucno")
    db.add(lokal)
    db.flush()
    zapisi(db, admin, Akcija.lokal, lokal.naziv, {"novi": True})
    db.commit()
    return lokal


@router.patch("/lokali/{lokal_id}", response_model=LokalOut)
def izmeni_lokal(lokal_id: int, body: LokalIn, admin: Korisnik = Depends(samo_admin), db: Session = Depends(get_db)):
    lokal = db.get(Lokal, lokal_id)
    if lokal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lokal ne postoji.")
    if lokal.izvor == "portal":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Lokal iz portala se menja u portalu, pa preuzme ponovo.")
    pre = {"naziv": lokal.naziv, "grad": lokal.grad, "aktivan": lokal.aktivan}
    lokal.naziv, lokal.grad, lokal.aktivan = body.naziv.strip(), body.grad, body.aktivan
    zapisi(db, admin, Akcija.lokal, lokal.naziv, {"pre": pre, "posle": body.model_dump()})
    db.commit()
    return lokal


class PortalOut(BaseModel):
    novih: int
    izmenjenih: int
    zatvorenih: int
    ukupno: int


@router.post("/lokali/portal", response_model=PortalOut)
def lokali_iz_portala(admin: Korisnik = Depends(samo_admin), db: Session = Depends(get_db)):
    try:
        rez = portal.uskladi(db, portal.preuzmi())
    except portal.GreskaPortala as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e)) from e
    zapisi(db, admin, Akcija.lokali_iz_portala, None, rez.__dict__)
    db.commit()
    return PortalOut(**rez.__dict__)


# ---------- polaznici ----------


def _slug(s: str) -> str:
    s = s.strip().lower().replace("đ", "dj")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "", s)


def slobodno_korisnicko_ime(db: Session, ime: str, prezime: str) -> str:
    osnova = ".".join(p for p in (_slug(ime), _slug(prezime)) if p) or "polaznik"
    zauzeta = set(db.scalars(select(Korisnik.korisnicko_ime).where(Korisnik.korisnicko_ime.like(f"{osnova}%"))))
    if osnova not in zauzeta:
        return osnova
    n = 2
    while f"{osnova}{n}" in zauzeta:
        n += 1
    return f"{osnova}{n}"


class PolaznikIn(BaseModel):
    ime: str = Field(min_length=1, max_length=80)
    prezime: str = Field(min_length=1, max_length=80)
    lokal_id: int


class PolaznikIzmena(BaseModel):
    ime: str | None = Field(default=None, min_length=1, max_length=80)
    prezime: str | None = Field(default=None, min_length=1, max_length=80)
    lokal_id: int | None = None
    aktivan: bool | None = None


class PolaznikOut(BaseModel):
    id: int
    ime: str
    prezime: str
    korisnicko_ime: str
    lokal: LokalOut | None
    # pozvan (čeka da postavi PIN), aktivan, zakljucan, iskljucen
    status: str
    poslednja_prijava: datetime | None
    kreiran_u: datetime
    # napredak na svim kursevima (zasad jedan): završeni nivoi, zrna, poslednje zrno
    nivoa: int = 0
    zrna: int = 0
    poslednja_aktivnost: datetime | None = None
    # najbolji procenat na završnom testu (menadžer ga vidi za svoje polaznike) i da li je položen
    test_najbolje: int | None = None
    test_polozen: bool = False


class PozivnicaOut(BaseModel):
    polaznik: PolaznikOut
    link: str
    istice_u: datetime


def _status(k: Korisnik) -> str:
    if not k.aktivan:
        return "iskljucen"
    if k.zakljucan:
        return "zakljucan"
    return "aktivan" if k.pin_hash else "pozvan"


def _napredak(db: Session, ids: list[int]) -> dict[int, "Napredak"]:
    if not ids:
        return {}
    zrna = {
        uid: (ukupno, poslednje)
        for uid, ukupno, poslednje in db.execute(
            select(Zrno.korisnik_id, func.sum(Zrno.iznos), func.max(Zrno.u))
            .where(Zrno.korisnik_id.in_(ids))
            .group_by(Zrno.korisnik_id)
        )
    }
    nivoa = dict(
        db.execute(
            select(NivoKorisnika.korisnik_id, func.count())
            .where(NivoKorisnika.korisnik_id.in_(ids))
            .group_by(NivoKorisnika.korisnik_id)
        ).all()
    )
    testovi = {
        uid: (najbolje, polozenih > 0)
        for uid, najbolje, polozenih in db.execute(
            select(Test.korisnik_id, func.max(Test.procenat), func.count().filter(Test.polozen.is_(True)))
            .where(Test.korisnik_id.in_(ids), Test.procenat.isnot(None))
            .group_by(Test.korisnik_id)
        )
    }
    return {uid: (nivoa.get(uid, 0), *zrna.get(uid, (0, None)), *testovi.get(uid, (None, False))) for uid in ids}


Napredak = tuple[int, int, datetime | None, int | None, bool]


def _polaznik_out(k: Korisnik, napredak: Napredak = (0, 0, None, None, False)) -> PolaznikOut:
    nivoa, zrna, poslednja, test_najbolje, test_polozen = napredak
    return PolaznikOut(
        nivoa=nivoa,
        zrna=zrna,
        poslednja_aktivnost=poslednja,
        test_najbolje=test_najbolje,
        test_polozen=test_polozen,
        id=k.id,
        ime=k.ime,
        prezime=k.prezime,
        korisnicko_ime=k.korisnicko_ime,
        lokal=LokalOut.model_validate(k.lokal) if k.lokal else None,
        status=_status(k),
        poslednja_prijava=k.poslednja_prijava,
        kreiran_u=k.kreiran_u,
    )


def _proveri_lokal(db: Session, korisnik: Korisnik, lokal_id: int) -> Lokal:
    lokal = db.get(Lokal, lokal_id)
    ids = dozvoljeni_lokal_ids(korisnik)
    if lokal is None or (ids is not None and lokal_id not in ids):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Nemaš pristup tom lokalu.")
    if not lokal.aktivan:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Lokal nije aktivan.")
    return lokal


def _polaznik(db: Session, korisnik: Korisnik, polaznik_id: int) -> Korisnik:
    k = db.get(Korisnik, polaznik_id)
    if k is None or not k.je_polaznik or not sme_polaznika(korisnik, k):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Polaznik ne postoji.")
    return k


def _nova_pozivnica(db: Session, autor: Korisnik, k: Korisnik) -> PozivnicaOut:
    """Poništava staru pozivnicu, briše PIN i obara prijave; vraća link koji se šalje polazniku."""
    trenutak = sada()
    db.execute(
        update(Pozivnica)
        .where(Pozivnica.korisnik_id == k.id, Pozivnica.iskoriscena_u.is_(None), Pozivnica.ponistena_u.is_(None))
        .values(ponistena_u=trenutak)
    )
    token, ot = novi_token_pozivnice()
    s = get_settings()
    pozivnica = Pozivnica(
        korisnik_id=k.id, otisak=ot, istice_u=trenutak + timedelta(days=s.pozivnica_vazi_dana), kreirao_id=autor.id
    )
    db.add(pozivnica)
    k.pin_hash = None
    k.neuspeli_pin = 0
    k.zakljucan = False
    k.sesije_od = trenutak
    return PozivnicaOut(
        polaznik=_polaznik_out(k), link=f"{s.app_url.rstrip('/')}/pozivnica/{token}", istice_u=pozivnica.istice_u
    )


@router.get("/polaznici", response_model=list[PolaznikOut])
def polaznici(
    lokal_id: int | None = None, korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)
):
    upit = select(Korisnik).where(Korisnik.uloga == Uloga.polaznik).order_by(Korisnik.prezime, Korisnik.ime)
    if lokal_id is not None:
        upit = upit.where(Korisnik.lokal_id == lokal_id)
    lista = list(db.scalars(filtriraj_polaznike(upit, korisnik)))
    napredak = _napredak(db, [k.id for k in lista])
    return [_polaznik_out(k, napredak[k.id]) for k in lista]


@router.post("/polaznici", response_model=PozivnicaOut, status_code=status.HTTP_201_CREATED)
def novi_polaznik(body: PolaznikIn, korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    lokal = _proveri_lokal(db, korisnik, body.lokal_id)
    k = Korisnik(
        ime=body.ime.strip(),
        prezime=body.prezime.strip(),
        korisnicko_ime=slobodno_korisnicko_ime(db, body.ime, body.prezime),
        uloga=Uloga.polaznik,
        lokal_id=lokal.id,
        aktivan=True,
        neuspeli_pin=0,
        zakljucan=False,
        kreirao_id=korisnik.id,
        kreiran_u=sada(),
    )
    db.add(k)
    db.flush()
    db.refresh(k, ["lokal"])
    out = _nova_pozivnica(db, korisnik, k)
    zapisi(db, korisnik, Akcija.nalog_otvoren, k.korisnicko_ime, {"uloga": "polaznik", "lokal": lokal.naziv})
    db.commit()
    return out


@router.post("/polaznici/{polaznik_id}/pozivnica", response_model=PozivnicaOut)
def ponovna_pozivnica(polaznik_id: int, korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    k = _polaznik(db, korisnik, polaznik_id)
    if not k.aktivan:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Polaznik je isključen; prvo ga uključi.")
    out = _nova_pozivnica(db, korisnik, k)
    zapisi(db, korisnik, Akcija.nova_pozivnica, k.korisnicko_ime)
    db.commit()
    return out


@router.patch("/polaznici/{polaznik_id}", response_model=PolaznikOut)
def izmeni_polaznika(
    polaznik_id: int, body: PolaznikIzmena, korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)
):
    k = _polaznik(db, korisnik, polaznik_id)
    izmene = body.model_dump(exclude_unset=True)
    if "lokal_id" in izmene:
        k.lokal_id = _proveri_lokal(db, korisnik, body.lokal_id).id
    if body.ime is not None:
        k.ime = body.ime.strip()
    if body.prezime is not None:
        k.prezime = body.prezime.strip()
    akcija = Akcija.nalog_izmenjen
    if body.aktivan is not None and body.aktivan != k.aktivan:
        k.aktivan = body.aktivan
        akcija = Akcija.nalog_ukljucen if body.aktivan else Akcija.nalog_iskljucen
        if not body.aktivan:
            k.sesije_od = sada()
    zapisi(db, korisnik, akcija, k.korisnicko_ime, izmene)
    db.commit()
    db.refresh(k, ["lokal"])
    return _polaznik_out(k)


# ---------- osoblje (samo admin) ----------


class OsobljeIn(BaseModel):
    ime: str = Field(min_length=1, max_length=80)
    prezime: str = Field(min_length=1, max_length=80)
    email: EmailStr
    uloga: Uloga
    lozinka: str = Field(min_length=MIN_LOZINKA, max_length=256)
    lokal_ids: list[int] = []


class OsobljeIzmena(BaseModel):
    uloga: Uloga | None = None
    aktivan: bool | None = None
    lokal_ids: list[int] | None = None
    lozinka: str | None = Field(default=None, min_length=MIN_LOZINKA, max_length=256)


class OsobljeOut(BaseModel):
    id: int
    ime: str
    prezime: str
    email: str | None
    uloga: str
    aktivan: bool
    lokali: list[LokalOut]
    poslednja_prijava: datetime | None


def _osoblje_out(k: Korisnik) -> OsobljeOut:
    return OsobljeOut(
        id=k.id,
        ime=k.ime,
        prezime=k.prezime,
        email=k.email,
        uloga=k.uloga,
        aktivan=k.aktivan,
        lokali=[LokalOut.model_validate(lokal) for lokal in k.lokali],
        poslednja_prijava=k.poslednja_prijava,
    )


def _lokali_po_id(db: Session, ids: list[int]) -> list[Lokal]:
    lokali = db.scalars(select(Lokal).where(Lokal.id.in_(ids))).all() if ids else []
    if len(lokali) != len(set(ids)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Nepoznat lokal.")
    return list(lokali)


def _proveri_ulogu_osoblja(uloga: Uloga) -> None:
    if uloga not in OSOBLJE:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Polaznik se dodaje preko pozivnice, ne kao osoblje.")


@router.get("/osoblje", response_model=list[OsobljeOut])
def osoblje(_: Korisnik = Depends(samo_admin), db: Session = Depends(get_db)):
    upit = select(Korisnik).where(Korisnik.uloga.in_(OSOBLJE)).order_by(Korisnik.prezime, Korisnik.ime)
    return [_osoblje_out(k) for k in db.scalars(upit)]


@router.post("/osoblje", response_model=OsobljeOut, status_code=status.HTTP_201_CREATED)
def novo_osoblje(body: OsobljeIn, admin: Korisnik = Depends(samo_admin), db: Session = Depends(get_db)):
    _proveri_ulogu_osoblja(body.uloga)
    email = body.email.strip().lower()
    if db.scalar(select(Korisnik).where(Korisnik.korisnicko_ime == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Nalog sa tim emailom već postoji.")
    k = Korisnik(
        ime=body.ime.strip(),
        prezime=body.prezime.strip(),
        korisnicko_ime=email,
        email=email,
        uloga=body.uloga,
        lozinka_hash=hash_tajne(body.lozinka),
        aktivan=True,
        neuspeli_pin=0,
        zakljucan=False,
        kreirao_id=admin.id,
        lokali=_lokali_po_id(db, body.lokal_ids) if body.uloga == Uloga.menadzer else [],
    )
    db.add(k)
    zapisi(db, admin, Akcija.nalog_otvoren, email, {"uloga": body.uloga, "lokal_ids": body.lokal_ids})
    db.commit()
    return _osoblje_out(k)


@router.patch("/osoblje/{korisnik_id}", response_model=OsobljeOut)
def izmeni_osoblje(
    korisnik_id: int, body: OsobljeIzmena, admin: Korisnik = Depends(samo_admin), db: Session = Depends(get_db)
):
    k = db.get(Korisnik, korisnik_id)
    if k is None or k.uloga not in OSOBLJE:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nalog ne postoji.")
    if k.id == admin.id and (body.aktivan is False or (body.uloga and body.uloga != Uloga.admin)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Ne možeš sebi da oduzmeš admin pristup.")
    detalji = body.model_dump(exclude_unset=True, exclude={"lozinka"})
    trenutak = sada()
    if body.uloga is not None:
        _proveri_ulogu_osoblja(body.uloga)
        k.uloga = body.uloga
    if body.lokal_ids is not None:
        k.lokali = _lokali_po_id(db, body.lokal_ids)
    if k.uloga != Uloga.menadzer:
        k.lokali = []
    if body.aktivan is not None:
        k.aktivan = body.aktivan
        if not body.aktivan:
            k.sesije_od = trenutak
    if body.lozinka is not None:
        k.lozinka_hash = hash_tajne(body.lozinka)
        k.sesije_od = trenutak
        zapisi(db, admin, Akcija.reset_lozinke, k.korisnicko_ime)
    if detalji:
        zapisi(db, admin, Akcija.nalog_izmenjen, k.korisnicko_ime, detalji)
    db.commit()
    return _osoblje_out(k)
