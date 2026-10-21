"""Završni test i sertifikat.

Za razliku od lekcija, ovde sve odlučuje server: izvlači pitanja, šalje ih bez tačnih odgovora, proverava svaki
odgovor i izdaje sertifikat sa kodom koji trener proverava u adminu.
"""

import random
import re
import secrets
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from core.audit import Akcija, zapisi
from core.db import get_db
from core.deps import samo_osoblje, trenutni_korisnik
from core.models import Korisnik, Uloga
from core.pristup import filtriraj_polaznike, sme_polaznika
from core.schemas import LokalOut
from core.vreme import sada
from modules.napredak import bodovanje as b
from modules.napredak.models import Odgovor
from modules.sadrzaj.kurs import kurs_za_ucenje, objavljen_kurs
from modules.sadrzaj.models import SadrzajVerzija
from modules.test.models import Sertifikat, Test

router = APIRouter(prefix="/api")

TIPOVI = ("mc", "tf", "num")
PO_NIVOU = 2  # svaki nivo daje bar dva pitanja (artifact buildExam)
SLAB_NIVO = 0.75  # ispod ove tačnosti nivo se predlaže za ponavljanje
ZRNA_ZA_PROLAZ = 100
# bez slova i cifara koje se mešaju pri prepisivanju (0/O, 1/I/L, U/V)
ABECEDA = "ABCDEFGHJKMNPQRSTWXYZ23456789"


# ---------- sadržaj testa ----------


def pitanja_za_test(dok: dict[str, Any]) -> dict[str, tuple[str, dict[str, Any]]]:
    """id → (nivo, pitanje): mc, tf i num iz lekcija i iz banke pitanja."""
    out: dict[str, tuple[str, dict[str, Any]]] = {}
    for n in dok["nivoi"]:
        for k in [*n["steps"], *n.get("pool", [])]:
            if k["t"] in TIPOVI:
                out[k["id"]] = (n["id"], k)
    return out


def izvuci(dok: dict[str, Any], rng: random.Random | None = None) -> list[str]:
    """Po dva pitanja iz svakog nivoa, ostatak nasumično, pa sve promešano (artifact buildExam)."""
    rng = rng or random.SystemRandom()
    velicina = dok["podesavanja"]["test_pitanja"]
    po_nivou: dict[str, list[str]] = {}
    for pid, (nivo, _) in pitanja_za_test(dok).items():
        po_nivou.setdefault(nivo, []).append(pid)
    izabrana: list[str] = []
    ostala: list[str] = []
    for ids in po_nivou.values():
        rng.shuffle(ids)
        izabrana += ids[:PO_NIVOU]
        ostala += ids[PO_NIVOU:]
    rng.shuffle(ostala)
    izabrana += ostala[: max(0, velicina - len(izabrana))]
    rng.shuffle(izabrana)
    return izabrana


def javno(pid: str, k: dict[str, Any]) -> dict[str, Any]:
    """Pitanje bez tačnog odgovora i objašnjenja: to ide na telefon tek posle odgovora."""
    return {"id": pid, **{x: v for x, v in k.items() if x not in ("a", "why", "id")}}


def oceni(k: dict[str, Any], odgovor: Any) -> float:
    """Isto kao provera u lekciji (artifact RENDER.mc/tf/num), ali na serveru."""
    if k["t"] == "mc":
        return 1.0 if isinstance(odgovor, int) and not isinstance(odgovor, bool) and odgovor == k["a"] else 0.0
    if k["t"] == "tf":
        return 1.0 if isinstance(odgovor, bool) and odgovor == k["a"] else 0.0
    if not isinstance(odgovor, (int, float)) or isinstance(odgovor, bool):
        return 0.0
    lo, hi = k["a"]
    if lo - 1e-9 <= odgovor <= hi + 1e-9:
        return 1.0
    blizu = min(abs(odgovor - lo), abs(odgovor - hi)) <= (k["max"] - k["min"]) * 0.06
    return 0.5 if blizu else 0.0


def nov_kod(db: Session) -> str:
    while True:
        k = "ZP-" + "".join(secrets.choice(ABECEDA) for _ in range(4)) + "-" + "".join(secrets.choice(ABECEDA) for _ in range(4))
        if not db.scalar(select(Sertifikat.id).where(Sertifikat.kod == k)):
            return k


def normalizuj_kod(kod: str) -> str:
    cist = re.sub(r"[^A-Z0-9]", "", kod.upper())
    cist = cist.removeprefix("ZP")
    return f"ZP-{cist[:4]}-{cist[4:]}" if len(cist) == 8 else kod.strip().upper()


# ---------- šeme ----------


class SertifikatOut(BaseModel):
    kod: str
    procenat: int
    izdat_u: datetime
    opozvan: bool


class TestStanjeOut(BaseModel):
    otkljucan: bool
    pitanja: int
    prag: int
    pokusaja: int
    najbolje: int
    polozen: bool
    sertifikat: SertifikatOut | None


class PokusajOut(BaseModel):
    test_id: int
    pitanja: list[dict[str, Any]]


class OdgovorIn(BaseModel):
    pitanje: str = Field(min_length=1, max_length=40)
    # mc: indeks ponuđenog odgovora, tf: true/false, num: broj sa klizača
    odgovor: bool | int | float
    vreme_ms: int | None = Field(default=None, ge=0, le=3_600_000)


class OdgovorOut(BaseModel):
    rezultat: float
    resenje: Any
    zasto: str | None


class ZavrsetakOut(BaseModel):
    procenat: int
    polozen: bool
    prag: int
    slabi_nivoi: list[str]
    sertifikat: SertifikatOut | None
    zrna: int
    ukupno_zrna: int
    novi_bedzevi: list[str]


def _sert_out(s: Sertifikat | None) -> SertifikatOut | None:
    if s is None:
        return None
    return SertifikatOut(kod=s.kod, procenat=s.procenat, izdat_u=s.izdat_u, opozvan=s.opozvan_u is not None)


def _sertifikat(db: Session, uid: int, kid: int) -> Sertifikat | None:
    return db.scalar(select(Sertifikat).where(Sertifikat.korisnik_id == uid, Sertifikat.kurs_id == kid))


def stanje_testa(db: Session, uid: int, kid: int) -> tuple[int, int, bool]:
    """(pokušaja, najbolji procenat, položen) iz završenih testova."""
    zavrseni = list(db.scalars(select(Test).where(Test.korisnik_id == uid, Test.kurs_id == kid, Test.procenat.isnot(None))))
    return len(zavrseni), max((t.procenat for t in zavrseni), default=0), any(t.polozen for t in zavrseni)


def _test(db: Session, korisnik: Korisnik, test_id: int) -> Test:
    t = db.get(Test, test_id)
    if t is None or t.korisnik_id != korisnik.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Test ne postoji.")
    if t.kraj is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ovaj pokušaj je završen.")
    return t


# ---------- polaznik ----------


@router.get("/test/{kurs}", response_model=TestStanjeOut)
def stanje(kurs: str, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    k = objavljen_kurs(db, kurs)
    dok = k.verzija.dokument
    pokusaja, najbolje, polozen = stanje_testa(db, korisnik.id, k.id)
    zavrseni = b.nivoi_korisnika(db, korisnik.id, k.id)
    return TestStanjeOut(
        otkljucan=all(n["id"] in zavrseni for n in dok["nivoi"]),
        pitanja=dok["podesavanja"]["test_pitanja"],
        prag=round(dok["podesavanja"]["prag"] * 100),
        pokusaja=pokusaja,
        najbolje=najbolje,
        polozen=polozen,
        sertifikat=_sert_out(_sertifikat(db, korisnik.id, k.id)),
    )


@router.post("/test/{kurs}/pokusaj", response_model=PokusajOut, status_code=status.HTTP_201_CREATED)
def nov_pokusaj(kurs: str, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    k = kurs_za_ucenje(db, korisnik, kurs)
    dok = k.verzija.dokument
    zavrseni = b.nivoi_korisnika(db, korisnik.id, k.id)
    if not all(n["id"] in zavrseni for n in dok["nivoi"]):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Završni test se otključava posle svih {len(dok['nivoi'])} nivoa.")
    # nov pokušaj prekida nedovršen (ostaje bez procenta)
    db.execute(
        update(Test).where(Test.korisnik_id == korisnik.id, Test.kurs_id == k.id, Test.kraj.is_(None)).values(kraj=sada())
    )
    izbor = izvuci(dok)
    t = Test(korisnik_id=korisnik.id, kurs_id=k.id, verzija_id=k.verzija_id, pitanja=izbor, pocetak=sada())
    db.add(t)
    db.commit()
    sva = pitanja_za_test(dok)
    return PokusajOut(test_id=t.id, pitanja=[javno(pid, sva[pid][1]) for pid in izbor])


@router.post("/test/pokusaji/{test_id}/odgovor", response_model=OdgovorOut)
def odgovor(test_id: int, body: OdgovorIn, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    t = _test(db, korisnik, test_id)
    if body.pitanje not in t.pitanja:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "To pitanje nije u ovom testu.")
    if db.scalar(select(Odgovor.id).where(Odgovor.test_id == t.id, Odgovor.pitanje == body.pitanje)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Na ovo pitanje je već odgovoreno.")
    nivo, k = pitanja_za_test(db.get(SadrzajVerzija, t.verzija_id).dokument)[body.pitanje]
    rezultat = oceni(k, body.odgovor)
    db.add(Odgovor(korisnik_id=korisnik.id, kurs_id=t.kurs_id, verzija_id=t.verzija_id, pitanje=body.pitanje, nivo=nivo,
                   kontekst="test", test_id=t.id, rezultat=rezultat, izbor=body.odgovor, vreme_ms=body.vreme_ms, u=sada()))
    db.commit()
    return OdgovorOut(rezultat=rezultat, resenje=k["a"], zasto=k.get("why"))


@router.post("/test/pokusaji/{test_id}/zavrsi", response_model=ZavrsetakOut)
def zavrsi(test_id: int, korisnik: Korisnik = Depends(trenutni_korisnik), db: Session = Depends(get_db)):
    t = _test(db, korisnik, test_id)
    odgovori = list(db.scalars(select(Odgovor).where(Odgovor.test_id == t.id)))
    if len(odgovori) < len(t.pitanja):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Nisu odgovorena sva pitanja.")

    dok = db.get(SadrzajVerzija, t.verzija_id).dokument
    prag = round(dok["podesavanja"]["prag"] * 100)
    procenat = round(sum(o.rezultat for o in odgovori) / len(odgovori) * 100)
    po_nivoima: dict[str, list[float]] = {}
    for o in odgovori:
        po_nivoima.setdefault(o.nivo, []).append(o.rezultat)
    t.kraj, t.procenat, t.polozen = sada(), procenat, procenat >= prag
    t.po_nivoima = {n: sum(v) / len(v) for n, v in po_nivoima.items()}

    novi: list[str] = []
    zrna = 0
    sert = _sertifikat(db, korisnik.id, t.kurs_id)
    if t.polozen:
        b.dodeli_bedz(db, korisnik.id, t.kurs_id, "ready", novi)
        if sert is None:
            # zrna samo za prvi prolaz, da se test ne ponavlja radi zrna
            zrna = ZRNA_ZA_PROLAZ
            sert = Sertifikat(korisnik_id=korisnik.id, kurs_id=t.kurs_id, test_id=t.id, kod=nov_kod(db),
                              procenat=procenat, izdat_u=sada())
            db.add(sert)
        elif sert.opozvan_u is not None:
            # trener je opozvao sertifikat: nov položen test daje nov kod, stari ostaje nevažeći
            sert.kod, sert.test_id, sert.procenat, sert.izdat_u = nov_kod(db), t.id, procenat, sada()
            sert.opozvan_u = sert.opozvao_id = sert.razlog_opoziva = None
        elif procenat > sert.procenat:
            sert.test_id, sert.procenat, sert.izdat_u = t.id, procenat, sada()
        b.dodaj_zrna(db, korisnik.id, t.kurs_id, zrna, "test", str(t.id), novi)
    db.commit()

    slabi = [n["id"] for n in dok["nivoi"] if n["id"] in t.po_nivoima and t.po_nivoima[n["id"]] < SLAB_NIVO]
    return ZavrsetakOut(
        procenat=procenat,
        polozen=t.polozen,
        prag=prag,
        slabi_nivoi=[] if t.polozen else slabi,
        sertifikat=_sert_out(sert) if t.polozen else None,
        zrna=zrna,
        ukupno_zrna=b.ukupno_zrna(db, korisnik.id, t.kurs_id),
        novi_bedzevi=novi,
    )


# ---------- osoblje ----------


class SertifikatAdminOut(BaseModel):
    id: int
    kod: str
    procenat: int
    izdat_u: datetime
    opozvan_u: datetime | None
    razlog_opoziva: str | None
    ime: str
    prezime: str
    korisnicko_ime: str
    lokal: LokalOut | None
    kurs: str


class OpozivIn(BaseModel):
    razlog: str = Field(min_length=3, max_length=300)


def _admin_out(s: Sertifikat) -> SertifikatAdminOut:
    k = s.korisnik
    return SertifikatAdminOut(
        id=s.id, kod=s.kod, procenat=s.procenat, izdat_u=s.izdat_u, opozvan_u=s.opozvan_u, razlog_opoziva=s.razlog_opoziva,
        ime=k.ime, prezime=k.prezime, korisnicko_ime=k.korisnicko_ime,
        lokal=LokalOut.model_validate(k.lokal) if k.lokal else None, kurs=s.kurs.naziv,
    )


@router.get("/admin/sertifikati", response_model=list[SertifikatAdminOut])
def sertifikati(korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    upit = select(Sertifikat).join(Korisnik, Korisnik.id == Sertifikat.korisnik_id).order_by(Sertifikat.izdat_u.desc())
    return [_admin_out(s) for s in db.scalars(filtriraj_polaznike(upit, korisnik))]


@router.get("/admin/sertifikati/{kod}", response_model=SertifikatAdminOut)
def proveri(kod: str, korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    s = db.scalar(select(Sertifikat).where(Sertifikat.kod == normalizuj_kod(kod)))
    # menadžer ne sme da sazna ni da kod postoji ako polaznik nije iz njegovog lokala
    if s is None or not sme_polaznika(korisnik, s.korisnik):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sertifikat sa tim kodom ne postoji.")
    return _admin_out(s)


@router.post("/admin/sertifikati/{sertifikat_id}/opozovi", response_model=SertifikatAdminOut)
def opozovi(sertifikat_id: int, body: OpozivIn, korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    if korisnik.uloga not in (Uloga.admin, Uloga.trener):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sertifikat opoziva trener ili admin.")
    s = db.get(Sertifikat, sertifikat_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sertifikat ne postoji.")
    if s.opozvan_u is None:
        s.opozvan_u, s.opozvao_id, s.razlog_opoziva = sada(), korisnik.id, body.razlog.strip()
        zapisi(db, korisnik, Akcija.sertifikat_opozvan, s.kod, {"polaznik": s.korisnik.korisnicko_ime, "razlog": s.razlog_opoziva})
        db.commit()
    return _admin_out(s)
