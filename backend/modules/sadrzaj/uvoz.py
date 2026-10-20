"""Provera i objava verzije kursa (dokument u formatu `data/osnovni-nivo.json`)."""

import hashlib
import json
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.vreme import sada
from modules.sadrzaj.models import Kurs, Pitanje, SadrzajVerzija

TIPOVI_KORAKA = {"story", "explore", "clip", "game", "mc", "tf", "num", "order", "match", "sort", "hotspot"}
IZAZOVI = {"mc", "tf", "num", "order", "match", "sort", "hotspot", "game"}
ZA_TEST = {"mc", "tf", "num"}


class NeispravanSadrzaj(ValueError):
    pass


def otisak_dokumenta(dok: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(dok, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def proveri(dok: dict[str, Any]) -> None:
    """Greške koje bi oborile polazničku aplikaciju ili pokvarile statistiku; skuplja sve odjednom."""
    greske: list[str] = []
    ids: set[str] = set()

    def jedinstven(i: Any, gde: str) -> None:
        if not isinstance(i, str) or not i:
            greske.append(f"{gde}: nema id")
        elif i in ids:
            greske.append(f"{gde}: id {i} se ponavlja")
        else:
            ids.add(i)

    for kljuc in ("kurs", "podesavanja", "nivoi", "rangovi", "bedzevi", "igre", "pojmovi"):
        if kljuc not in dok:
            greske.append(f"nedostaje '{kljuc}'")
    if greske:
        raise NeispravanSadrzaj("; ".join(greske))

    nivoi = {n.get("id") for n in dok["nivoi"]}
    for n in dok["nivoi"]:
        jedinstven(n.get("id"), "nivo")
        for k in n.get("steps", []):
            gde = f"{n.get('id')}/{k.get('id')}"
            jedinstven(k.get("id"), gde)
            if k.get("t") not in TIPOVI_KORAKA:
                greske.append(f"{gde}: nepoznat tip '{k.get('t')}'")
            if k.get("t") == "mc" and not (0 <= k.get("a", -1) < len(k.get("opts", []))):
                greske.append(f"{gde}: tačan odgovor van ponuđenih")
        for k in n.get("pool", []):
            jedinstven(k.get("id"), f"{n.get('id')}/{k.get('id')}")
            if k.get("t") not in ZA_TEST:
                greske.append(f"{n.get('id')}/{k.get('id')}: u banci smeju samo mc, tf i num")
        for k in n.get("swipe", []):
            jedinstven(k.get("id"), f"{n.get('id')}/{k.get('id')}")
    for p in dok["pojmovi"]:
        jedinstven(p.get("id"), "pojam")
        if p.get("nivo") not in nivoi:
            greske.append(f"pojam {p.get('id')}: nepoznat nivo {p.get('nivo')}")
    for g in dok["igre"]:
        if g.get("after") not in nivoi:
            greske.append(f"igra {g.get('id')}: otključava se posle nepoznatog nivoa {g.get('after')}")
        if g.get("implementacija", "js") not in ("js", "unity"):
            greske.append(f"igra {g.get('id')}: implementacija mora biti js ili unity")
    if greske:
        raise NeispravanSadrzaj("; ".join(greske))


def _tekst(k: dict[str, Any]) -> str:
    return str(k.get("q") or k.get("title") or k.get("id"))


def _uskladi_pitanja(db: Session, kurs: Kurs, dok: dict[str, Any]) -> None:
    postojeca = {p.kljuc: p for p in db.scalars(select(Pitanje).where(Pitanje.kurs_id == kurs.id))}
    vidjena: set[str] = set()

    def upisi(kljuc: str, nivo: str, tip: str, gde: str, tekst: str) -> None:
        vidjena.add(kljuc)
        p = postojeca.get(kljuc)
        if p is None:
            p = Pitanje(kurs_id=kurs.id, kljuc=kljuc)
            db.add(p)
        p.nivo, p.tip, p.gde, p.tekst = nivo, tip, gde, tekst
        p.za_test = tip in ZA_TEST and gde in ("lekcija", "banka")
        p.aktivno = True

    for n in dok["nivoi"]:
        for k in n.get("steps", []):
            if k["t"] in IZAZOVI:
                upisi(k["id"], n["id"], k["t"], "lekcija", _tekst(k))
        for k in n.get("pool", []):
            upisi(k["id"], n["id"], k["t"], "banka", _tekst(k))
        for k in n.get("swipe", []):
            upisi(k["id"], n["id"], "swipe", "brza_runda", _tekst(k))
    for kljuc, p in postojeca.items():
        if kljuc not in vidjena:
            p.aktivno = False


def objavi(db: Session, dok: dict[str, Any], napomena: str | None = None, kreirao_id: int | None = None) -> SadrzajVerzija:
    """Nova objavljena verzija kursa. Ako je isti dokument već objavljen, vraća postojeću verziju.

    Commit radi pozivalac.
    """
    proveri(dok)
    kk = dok["kurs"]
    kurs = db.scalar(select(Kurs).where(Kurs.kljuc == kk["kljuc"]))
    if kurs is None:
        kurs = Kurs(kljuc=kk["kljuc"], naziv=kk["naziv"], opis=kk.get("opis"))
        db.add(kurs)
        db.flush()
    kurs.naziv, kurs.opis = kk["naziv"], kk.get("opis")

    ot = otisak_dokumenta(dok)
    if kurs.verzija and kurs.verzija.otisak == ot:
        return kurs.verzija

    broj = (db.scalar(select(func.max(SadrzajVerzija.broj)).where(SadrzajVerzija.kurs_id == kurs.id)) or 0) + 1
    verzija = SadrzajVerzija(
        kurs_id=kurs.id, broj=broj, dokument=dok, otisak=ot, napomena=napomena, objavljena_u=sada(), kreirao_id=kreirao_id
    )
    db.add(verzija)
    db.flush()
    kurs.verzija = verzija
    _uskladi_pitanja(db, kurs, dok)
    return verzija


def za_polaznika(dok: dict[str, Any]) -> dict[str, Any]:
    """Dokument bez banke pitanja: ona služi samo za završni test i ne sme do telefona sa odgovorima."""
    return {**dok, "nivoi": [{k: v for k, v in n.items() if k != "pool"} for n in dok["nivoi"]]}
