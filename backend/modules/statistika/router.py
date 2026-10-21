"""Admin statistika: pregled, pitanja, igre, lokali, detalj polaznika.

Sve se računa samo nad polaznicima koje korisnik sme da vidi (core.pristup): menadžer vidi svoje lokale.
Brojevi su za aktivne naloge polaznika; isključeni nalozi ne ulaze u statistiku.
"""

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.db import get_db
from core.deps import samo_osoblje
from core.models import Korisnik, Lokal, Uloga
from core.pristup import dozvoljeni_lokal_ids, filtriraj_polaznike, sme_polaznika
from core.vreme import TZ, danas, sada
from modules.igre.models import RezultatIgre
from modules.napredak.models import BedzKorisnika, NivoKorisnika, Odgovor, ProlazNivoa, Zrno
from modules.sadrzaj.kurs import objavljen_kurs
from modules.sadrzaj.models import Kurs, Pitanje
from modules.test.models import Sertifikat, Test

router = APIRouter(prefix="/api/admin/statistika")
detalj_router = APIRouter(prefix="/api/admin/polaznici")

ZAPEO_POSLE_DANA = 7


# ---------- zajedničko ----------


def _polaznici(db: Session, korisnik: Korisnik, lokal_id: int | None) -> list[Korisnik]:
    upit = select(Korisnik).where(Korisnik.uloga == Uloga.polaznik, Korisnik.aktivan.is_(True))
    if lokal_id is not None:
        upit = upit.where(Korisnik.lokal_id == lokal_id)
    return list(db.scalars(filtriraj_polaznike(upit, korisnik)))


def _aktivnost(db: Session, ids: list[int], kurs_id: int, od: datetime | None = None) -> dict[int, list[datetime]]:
    """Trenuci aktivnosti po polazniku: odgovori (lekcija, test), igre i zrna (kartice)."""
    out: dict[int, list[datetime]] = defaultdict(list)
    if not ids:
        return out
    for model in (Odgovor, RezultatIgre, Zrno):
        upit = select(model.korisnik_id, model.u).where(model.korisnik_id.in_(ids), model.kurs_id == kurs_id)
        if od is not None:
            upit = upit.where(model.u >= od)
        for uid, u in db.execute(upit):
            out[uid].append(u)
    return out


def _dan(t: datetime) -> date:
    return t.astimezone(TZ).date()


class PolaznikKratko(BaseModel):
    id: int
    ime: str
    prezime: str
    lokal: str | None
    nivoa: int
    poslednja_aktivnost: datetime | None
    dana_bez_aktivnosti: int | None


# ---------- pregled ----------


class DanAktivnosti(BaseModel):
    dan: date
    polaznika: int
    zrna: int


class KorakLevka(BaseModel):
    kljuc: str
    naziv: str
    polaznika: int


class PregledOut(BaseModel):
    polaznika: int
    pozvanih: int
    aktivnih_danas: int
    aktivnih_7d: int
    zavrsili_sve_nivoe: int
    polozili_test: int
    prosek_testa: int | None
    levak: list[KorakLevka]
    aktivnost: list[DanAktivnosti]
    zapeli: list[PolaznikKratko]


@router.get("/pregled", response_model=PregledOut)
def pregled(
    kurs: str = "osnovni",
    lokal_id: int | None = None,
    korisnik: Korisnik = Depends(samo_osoblje),
    db: Session = Depends(get_db),
):
    k = objavljen_kurs(db, kurs)
    nivoi = k.verzija.dokument["nivoi"]
    lista = _polaznici(db, korisnik, lokal_id)
    ids = [p.id for p in lista]
    po_id = {p.id: p for p in lista}
    d = danas()

    zavrseni: dict[int, set[str]] = defaultdict(set)
    if ids:
        for uid, nivo in db.execute(
            select(NivoKorisnika.korisnik_id, NivoKorisnika.nivo).where(
                NivoKorisnika.korisnik_id.in_(ids), NivoKorisnika.kurs_id == k.id
            )
        ):
            zavrseni[uid].add(nivo)
    najbolji_test: dict[int, int] = {}
    polozili: set[int] = set()
    if ids:
        for uid, procenat, polozen in db.execute(
            select(Test.korisnik_id, Test.procenat, Test.polozen).where(
                Test.korisnik_id.in_(ids), Test.kurs_id == k.id, Test.procenat.isnot(None)
            )
        ):
            najbolji_test[uid] = max(najbolji_test.get(uid, 0), procenat)
            if polozen:
                polozili.add(uid)

    sva = _aktivnost(db, ids, k.id)
    dani: dict[int, set[date]] = {uid: {_dan(t) for t in ts} for uid, ts in sva.items()}
    poslednja = {uid: max(ts) for uid, ts in sva.items() if ts}

    zrna_po_danu: Counter[date] = Counter()
    if ids:
        for dan, iznos in db.execute(
            select(Zrno.dan, func.sum(Zrno.iznos))
            .where(Zrno.korisnik_id.in_(ids), Zrno.kurs_id == k.id, Zrno.dan >= d - timedelta(days=13))
            .group_by(Zrno.dan)
        ):
            zrna_po_danu[dan] = int(iznos)
    aktivnost = [
        DanAktivnosti(dan=x, polaznika=sum(1 for s in dani.values() if x in s), zrna=zrna_po_danu[x])
        for x in (d - timedelta(days=13 - i) for i in range(14))
    ]

    levak = [KorakLevka(kljuc="pin", naziv="Postavili PIN", polaznika=sum(1 for p in lista if p.pin_hash))]
    levak += [
        KorakLevka(kljuc=n["id"], naziv=f"Nivo {n['n']} · {n['title']}", polaznika=sum(1 for s in zavrseni.values() if n["id"] in s))
        for n in nivoi
    ]
    levak.append(KorakLevka(kljuc="test", naziv="Položen završni test", polaznika=len(polozili)))

    zapeli = []
    for p in lista:
        if p.id in polozili or not p.pin_hash:
            continue
        posl = poslednja.get(p.id)
        od = posl or p.poslednja_prijava or p.kreiran_u
        dana = (d - _dan(od)).days
        if dana >= ZAPEO_POSLE_DANA:
            zapeli.append(
                PolaznikKratko(id=p.id, ime=p.ime, prezime=p.prezime, lokal=p.lokal.naziv if p.lokal else None,
                               nivoa=len(zavrseni.get(p.id, ())), poslednja_aktivnost=posl, dana_bez_aktivnosti=dana)
            )
    zapeli.sort(key=lambda x: -(x.dana_bez_aktivnosti or 0))

    return PregledOut(
        polaznika=len(lista),
        pozvanih=sum(1 for p in lista if not p.pin_hash),
        aktivnih_danas=sum(1 for s in dani.values() if d in s),
        aktivnih_7d=sum(1 for s in dani.values() if any((d - x).days < 7 for x in s)),
        zavrsili_sve_nivoe=sum(1 for s in zavrseni.values() if all(n["id"] in s for n in nivoi)),
        polozili_test=len(polozili),
        prosek_testa=round(sum(najbolji_test.values()) / len(najbolji_test)) if najbolji_test else None,
        levak=levak,
        aktivnost=aktivnost,
        zapeli=zapeli[:50],
    )


# ---------- pitanja ----------


class PitanjeStat(BaseModel):
    kljuc: str
    nivo: str
    tip: str
    tekst: str
    odgovora: int
    tacnost: int
    # mc: tekst ponuđenog odgovora koji se najčešće bira pogrešno, i koliko puta
    najcesci_pogresan: str | None
    pogresan_puta: int


def _tekst_izbora(k: dict[str, Any] | None, izbor: Any) -> str | None:
    if k is None or izbor is None:
        return None
    if k["t"] == "mc" and isinstance(izbor, int) and 0 <= izbor < len(k.get("opts", [])):
        return k["opts"][izbor]
    if k["t"] == "num" and isinstance(izbor, (int, float)):
        return f"{izbor:g} {k.get('unit', '')}".strip()
    return None


@router.get("/pitanja", response_model=list[PitanjeStat])
def pitanja(
    kurs: str = "osnovni",
    lokal_id: int | None = None,
    kontekst: str | None = Query(default=None, pattern="^(lekcija|test)$"),
    min_odgovora: int = Query(default=3, ge=1, le=1000),
    korisnik: Korisnik = Depends(samo_osoblje),
    db: Session = Depends(get_db),
):
    k = objavljen_kurs(db, kurs)
    ids = [p.id for p in _polaznici(db, korisnik, lokal_id)]
    if not ids:
        return []
    upit = select(Odgovor.pitanje, Odgovor.rezultat, Odgovor.izbor).where(Odgovor.korisnik_id.in_(ids), Odgovor.kurs_id == k.id)
    if kontekst:
        upit = upit.where(Odgovor.kontekst == kontekst)
    rezultati: dict[str, list[float]] = defaultdict(list)
    pogresni: dict[str, Counter] = defaultdict(Counter)
    for pid, rez, izbor in db.execute(upit):
        rezultati[pid].append(rez)
        if rez < 0.99 and izbor is not None and not isinstance(izbor, bool):
            pogresni[pid][izbor] += 1

    indeks = {p.kljuc: p for p in db.scalars(select(Pitanje).where(Pitanje.kurs_id == k.id))}
    koraci = {
        x["id"]: x for n in k.verzija.dokument["nivoi"] for x in [*n["steps"], *n.get("pool", [])]
    }
    out = []
    for pid, rez in rezultati.items():
        if len(rez) < min_odgovora or pid not in indeks:
            continue
        p = indeks[pid]
        naj = pogresni[pid].most_common(1)
        out.append(
            PitanjeStat(
                kljuc=pid, nivo=p.nivo, tip=p.tip, tekst=p.tekst, odgovora=len(rez), tacnost=round(sum(rez) / len(rez) * 100),
                najcesci_pogresan=_tekst_izbora(koraci.get(pid), naj[0][0]) if naj else None,
                pogresan_puta=naj[0][1] if naj else 0,
            )
        )
    out.sort(key=lambda x: (x.tacnost, -x.odgovora))
    return out


# ---------- igre ----------


class IgraStat(BaseModel):
    igra: str
    naziv: str
    igranja: int
    igraca: int
    prosek: int
    tri_zvezdice: int
    iz_lekcija: int
    unity: int
    # igranja 3D verzije (three.js, proba)
    tri_d: int


@router.get("/igre", response_model=list[IgraStat])
def igre(
    kurs: str = "osnovni",
    lokal_id: int | None = None,
    korisnik: Korisnik = Depends(samo_osoblje),
    db: Session = Depends(get_db),
):
    k = objavljen_kurs(db, kurs)
    ids = [p.id for p in _polaznici(db, korisnik, lokal_id)]
    redovi = list(db.scalars(select(RezultatIgre).where(RezultatIgre.korisnik_id.in_(ids), RezultatIgre.kurs_id == k.id))) if ids else []
    out = []
    for g in k.verzija.dokument["igre"]:
        r = [x for x in redovi if x.igra == g["id"]]
        out.append(
            IgraStat(
                igra=g["id"], naziv=g["t"], igranja=len(r), igraca=len({x.korisnik_id for x in r}),
                prosek=round(sum(x.rezultat for x in r) / len(r) * 100) if r else 0,
                tri_zvezdice=round(sum(1 for x in r if x.zvezdice == 3) / len(r) * 100) if r else 0,
                iz_lekcija=sum(1 for x in r if x.kontekst == "lekcija"),
                unity=sum(1 for x in r if x.izvor == "unity"),
                tri_d=sum(1 for x in r if x.izvor == "3d"),
            )
        )
    return out


# ---------- lokali ----------


class LokalStat(BaseModel):
    id: int
    naziv: str
    polaznika: int
    aktivnih_7d: int
    prosek_nivoa: float
    polozili_test: int
    prosek_testa: int | None


@router.get("/lokali", response_model=list[LokalStat])
def lokali(kurs: str = "osnovni", korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    k = objavljen_kurs(db, kurs)
    upit = select(Lokal).where(Lokal.aktivan.is_(True)).order_by(Lokal.naziv)
    dozvoljeni = dozvoljeni_lokal_ids(korisnik)
    if dozvoljeni is not None:
        upit = upit.where(Lokal.id.in_(dozvoljeni))
    lista = _polaznici(db, korisnik, None)
    ids = [p.id for p in lista]
    od = sada() - timedelta(days=7)
    aktivni = set(_aktivnost(db, ids, k.id, od))
    nivoa = Counter(
        dict(db.execute(select(NivoKorisnika.korisnik_id, func.count()).where(NivoKorisnika.korisnik_id.in_(ids), NivoKorisnika.kurs_id == k.id).group_by(NivoKorisnika.korisnik_id)).all())
    ) if ids else Counter()
    testovi: dict[int, tuple[int, bool]] = {}
    if ids:
        for uid, procenat, polozen in db.execute(
            select(Test.korisnik_id, Test.procenat, Test.polozen).where(Test.korisnik_id.in_(ids), Test.kurs_id == k.id, Test.procenat.isnot(None))
        ):
            pre = testovi.get(uid, (0, False))
            testovi[uid] = (max(pre[0], procenat), pre[1] or bool(polozen))

    out = []
    for lokal in db.scalars(upit):
        ljudi = [p for p in lista if p.lokal_id == lokal.id]
        rezultati = [testovi[p.id][0] for p in ljudi if p.id in testovi]
        out.append(
            LokalStat(
                id=lokal.id, naziv=lokal.naziv, polaznika=len(ljudi),
                aktivnih_7d=sum(1 for p in ljudi if p.id in aktivni),
                prosek_nivoa=round(sum(nivoa[p.id] for p in ljudi) / len(ljudi), 1) if ljudi else 0,
                polozili_test=sum(1 for p in ljudi if testovi.get(p.id, (0, False))[1]),
                prosek_testa=round(sum(rezultati) / len(rezultati)) if rezultati else None,
            )
        )
    return [x for x in out if x.polaznika > 0] + [x for x in out if x.polaznika == 0]


# ---------- detalj polaznika ----------


class NivoDetalj(BaseModel):
    nivo: str
    naziv: str
    zavrsen_u: datetime | None
    zvezdice: int
    najbolje: int
    prolazaka: int
    tacnost_odgovora: int | None


class TestDetalj(BaseModel):
    pocetak: datetime
    kraj: datetime | None
    procenat: int | None
    polozen: bool | None


class Dogadjaj(BaseModel):
    u: datetime
    vrsta: str
    opis: str


class DetaljOut(BaseModel):
    id: int
    ime: str
    prezime: str
    korisnicko_ime: str
    lokal: str | None
    zrna: int
    nivoi: list[NivoDetalj]
    testovi: list[TestDetalj]
    sertifikat: str | None
    bedzevi: list[str]
    igre: dict[str, int]
    najslabija_pitanja: list[PitanjeStat]
    dogadjaji: list[Dogadjaj]


@detalj_router.get("/{polaznik_id}/detalj", response_model=DetaljOut)
def detalj(
    polaznik_id: int, kurs: str = "osnovni", korisnik: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)
):
    p = db.get(Korisnik, polaznik_id)
    if p is None or not p.je_polaznik or not sme_polaznika(korisnik, p):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Polaznik ne postoji.")
    k: Kurs = objavljen_kurs(db, kurs)
    dok = k.verzija.dokument
    naziv_nivoa = {n["id"]: f"Nivo {n['n']} · {n['title']}" for n in dok["nivoi"]}
    naziv_igre = {g["id"]: g["t"] for g in dok["igre"]}
    naziv_bedza = {x["id"]: x["naziv"] for x in dok["bedzevi"]}

    zavrseni = {n.nivo: n for n in db.scalars(select(NivoKorisnika).where(NivoKorisnika.korisnik_id == p.id, NivoKorisnika.kurs_id == k.id))}
    odgovori = list(db.scalars(select(Odgovor).where(Odgovor.korisnik_id == p.id, Odgovor.kurs_id == k.id)))
    po_nivou: dict[str, list[float]] = defaultdict(list)
    po_pitanju: dict[str, list[float]] = defaultdict(list)
    for o in odgovori:
        if o.kontekst == "lekcija":
            po_nivou[o.nivo].append(o.rezultat)
        po_pitanju[o.pitanje].append(o.rezultat)
    nivoi = [
        NivoDetalj(
            nivo=n["id"], naziv=naziv_nivoa[n["id"]],
            zavrsen_u=zavrseni[n["id"]].zavrsen_u if n["id"] in zavrseni else None,
            zvezdice=zavrseni[n["id"]].zvezdice if n["id"] in zavrseni else 0,
            najbolje=zavrseni[n["id"]].najbolje if n["id"] in zavrseni else 0,
            prolazaka=zavrseni[n["id"]].prolazaka if n["id"] in zavrseni else 0,
            tacnost_odgovora=round(sum(po_nivou[n["id"]]) / len(po_nivou[n["id"]]) * 100) if po_nivou[n["id"]] else None,
        )
        for n in dok["nivoi"]
    ]
    testovi = list(db.scalars(select(Test).where(Test.korisnik_id == p.id, Test.kurs_id == k.id).order_by(Test.pocetak.desc())))
    sert = db.scalar(select(Sertifikat).where(Sertifikat.korisnik_id == p.id, Sertifikat.kurs_id == k.id))
    bedzevi = list(db.scalars(select(BedzKorisnika).where(BedzKorisnika.korisnik_id == p.id, BedzKorisnika.kurs_id == k.id)))
    igre_r = list(db.scalars(select(RezultatIgre).where(RezultatIgre.korisnik_id == p.id, RezultatIgre.kurs_id == k.id)))
    indeks = {x.kljuc: x for x in db.scalars(select(Pitanje).where(Pitanje.kurs_id == k.id))}

    slaba = sorted(
        (
            PitanjeStat(kljuc=pid, nivo=indeks[pid].nivo, tip=indeks[pid].tip, tekst=indeks[pid].tekst, odgovora=len(r),
                        tacnost=round(sum(r) / len(r) * 100), najcesci_pogresan=None, pogresan_puta=0)
            for pid, r in po_pitanju.items()
            if pid in indeks and sum(r) / len(r) < 0.99
        ),
        key=lambda x: (x.tacnost, -x.odgovora),
    )[:8]

    dogadjaji = [
        Dogadjaj(u=x.kraj, vrsta="nivo", opis=f"{naziv_nivoa.get(x.nivo, x.nivo)}: {x.zvezdice}★, {round(x.poeni / x.izazova * 100) if x.izazova else 100}%")
        for x in db.scalars(select(ProlazNivoa).where(ProlazNivoa.korisnik_id == p.id, ProlazNivoa.kurs_id == k.id, ProlazNivoa.kraj.isnot(None)))
    ]
    dogadjaji += [
        Dogadjaj(u=t.kraj, vrsta="test", opis=f"Završni test: {t.procenat}%{' (položen)' if t.polozen else ''}")
        for t in testovi if t.kraj and t.procenat is not None
    ]
    dogadjaji += [
        Dogadjaj(u=g.u, vrsta="igra", opis=f"{naziv_igre.get(g.igra, g.igra)}: {g.poeni if g.igra == 'swipe' else round(g.rezultat * 100)}{' poena' if g.igra == 'swipe' else '%'}")
        for g in igre_r if g.kontekst == "igraonica"
    ]
    dogadjaji += [Dogadjaj(u=b.u, vrsta="bedz", opis=f"Bedž: {naziv_bedza.get(b.bedz, b.bedz)}") for b in bedzevi]
    dogadjaji.sort(key=lambda x: x.u, reverse=True)

    najbolje_igre: dict[str, int] = {}
    for g in igre_r:
        m = g.poeni if g.igra == "swipe" else round(g.rezultat * 100)
        najbolje_igre[g.igra] = max(najbolje_igre.get(g.igra, 0), m)

    return DetaljOut(
        id=p.id, ime=p.ime, prezime=p.prezime, korisnicko_ime=p.korisnicko_ime, lokal=p.lokal.naziv if p.lokal else None,
        zrna=db.scalar(select(func.coalesce(func.sum(Zrno.iznos), 0)).where(Zrno.korisnik_id == p.id, Zrno.kurs_id == k.id)),
        nivoi=nivoi,
        testovi=[TestDetalj(pocetak=t.pocetak, kraj=t.kraj, procenat=t.procenat, polozen=t.polozen) for t in testovi],
        sertifikat=sert.kod if sert and sert.opozvan_u is None else None,
        bedzevi=[naziv_bedza.get(b.bedz, b.bedz) for b in sorted(bedzevi, key=lambda b: b.u)],
        igre=najbolje_igre,
        najslabija_pitanja=slaba,
        dogadjaji=dogadjaji[:40],
    )
