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


def _proveri_korak(k: dict[str, Any], gde: str, greske: list[str]) -> None:
    """Polja koja ekran tog tipa koraka čita; bez njih bi se lekcija srušila na telefonu."""
    t = k.get("t")
    tekst = lambda x: isinstance(k.get(x), str) and k[x].strip() != ""  # noqa: E731
    if t in IZAZOVI and t != "game" and not tekst("q"):
        greske.append(f"{gde}: nema pitanja (q)")
    if t in ("story", "explore", "clip", "game") and not tekst("title"):
        greske.append(f"{gde}: nema naslova")
    if t == "mc":
        opts = k.get("opts")
        if not isinstance(opts, list) or len(opts) < 2 or not all(isinstance(o, str) and o.strip() for o in opts):
            greske.append(f"{gde}: treba bar dva ponuđena odgovora")
        elif not (isinstance(k.get("a"), int) and 0 <= k["a"] < len(opts)):
            greske.append(f"{gde}: tačan odgovor van ponuđenih")
    elif t == "tf" and not isinstance(k.get("a"), bool):
        greske.append(f"{gde}: tačno ili netačno nije izabrano")
    elif t == "num":
        try:
            lo, hi = k["a"]
            ok = k["min"] < k["max"] and k["step"] > 0 and k["min"] <= lo <= hi <= k["max"] and k["min"] <= k["start"] <= k["max"]
        except (KeyError, TypeError, ValueError):
            ok = False
        if not ok:
            greske.append(f"{gde}: klizač treba min < max, korak > 0, a tačan opseg i početna vrednost unutar min–max")
    elif t == "order" and not (isinstance(k.get("items"), list) and len(k["items"]) >= 2):
        greske.append(f"{gde}: ređanje treba bar dve stavke")
    elif t == "match" and not (
        isinstance(k.get("pairs"), list) and len(k["pairs"]) >= 2 and all(isinstance(p, list) and len(p) == 2 for p in k["pairs"])
    ):
        greske.append(f"{gde}: spajanje treba bar dva para")
    elif t == "sort":
        if not (isinstance(k.get("items"), list) and len(k["items"]) >= 2 and all(isinstance(x, list) and len(x) == 2 and x[1] in (0, 1) and not isinstance(x[1], bool) for x in k["items"])):
            # strana je 0 (leva) ili 1 (desna), kao u artifactu
            greske.append(f"{gde}: prevlačenje treba bar dve stavke sa stranom")
        if not (tekst("left") and tekst("right")):
            greske.append(f"{gde}: prevlačenje treba nazive leve i desne strane")


def greske_sadrzaja(dok: dict[str, Any]) -> list[str]:
    """Greške koje bi oborile polazničku aplikaciju ili pokvarile statistiku; sve odjednom."""
    greske: list[str] = []
    ids: set[str] = set()

    def jedinstven(i: Any, gde: str) -> None:
        if not isinstance(i, str) or not i:
            greske.append(f"{gde}: nema id")
        elif i in ids:
            greske.append(f"{gde}: id {i} se ponavlja")
        else:
            ids.add(i)

    for kljuc in ("kurs", "podesavanja", "nivoi", "delovi", "rangovi", "bedzevi", "igre", "pojmovi"):
        if kljuc not in dok:
            greske.append(f"nedostaje '{kljuc}'")
    if greske:
        return greske

    pod = dok["podesavanja"]
    if not (isinstance(pod.get("prag"), (int, float)) and 0.5 <= pod["prag"] <= 1):
        greske.append("podešavanja: prag za test mora biti između 50% i 100%")
    if not (isinstance(pod.get("test_pitanja"), int) and 5 <= pod["test_pitanja"] <= 50):
        greske.append("podešavanja: broj pitanja na testu mora biti između 5 i 50")
    if not (isinstance(pod.get("dnevni_cilj"), int) and 10 <= pod["dnevni_cilj"] <= 1000):
        greske.append("podešavanja: dnevni cilj mora biti između 10 i 1000 zrna")

    nivoi = {n.get("id") for n in dok["nivoi"]}
    if not dok["nivoi"]:
        greske.append("kurs nema nijedan nivo")
    # staza na telefonu crta nivoe po delovima: svaki nivo mora biti u tačno jednom delu
    u_delovima = [i for d in dok["delovi"] for i in d.get("nivoi", [])]
    for i in sorted(nivoi - set(u_delovima), key=str):
        greske.append(f"{i}: nivo nije ni u jednom delu kursa")
    for i in sorted({i for i in u_delovima if u_delovima.count(i) > 1 or i not in nivoi}, key=str):
        greske.append(f"delovi: nivo {i} se ponavlja ili ne postoji")
    if not dok["rangovi"]:
        greske.append("kurs nema nijedan rang")
    za_test = 0
    for n in dok["nivoi"]:
        jedinstven(n.get("id"), "nivo")
        if not str(n.get("title", "")).strip():
            greske.append(f"{n.get('id')}: nivo nema naziv")
        if not n.get("steps"):
            greske.append(f"{n.get('id')}: nivo nema nijedan korak")
        for k in n.get("steps", []):
            gde = f"{n.get('id')}/{k.get('id')}"
            jedinstven(k.get("id"), gde)
            if k.get("t") not in TIPOVI_KORAKA:
                greske.append(f"{gde}: nepoznat tip '{k.get('t')}'")
            else:
                _proveri_korak(k, gde, greske)
            za_test += k.get("t") in ZA_TEST
        for k in n.get("pool", []):
            gde = f"{n.get('id')}/{k.get('id')}"
            jedinstven(k.get("id"), gde)
            if k.get("t") not in ZA_TEST:
                greske.append(f"{gde}: u banci smeju samo mc, tf i num")
            else:
                _proveri_korak(k, gde, greske)
                za_test += 1
        for k in n.get("swipe", []):
            gde = f"{n.get('id')}/{k.get('id')}"
            jedinstven(k.get("id"), gde)
            if not (isinstance(k.get("q"), str) and k["q"].strip() and isinstance(k.get("a"), bool)):
                greske.append(f"{gde}: tvrdnja za Brzu rundu treba tekst i tačno/netačno")
    if isinstance(pod.get("test_pitanja"), int) and za_test < pod["test_pitanja"]:
        greske.append(f"podešavanja: test traži {pod['test_pitanja']} pitanja, a u kursu ih ima {za_test}")
    for p in dok["pojmovi"]:
        jedinstven(p.get("id"), "pojam")
        if p.get("nivo") not in nivoi:
            greske.append(f"pojam {p.get('id')}: nepoznat nivo {p.get('nivo')}")
        if not (str(p.get("pojam", "")).strip() and str(p.get("opis", "")).strip()):
            greske.append(f"pojam {p.get('id')}: treba naziv i opis")
    for g in dok["igre"]:
        if g.get("after") not in nivoi:
            greske.append(f"igra {g.get('id')}: otključava se posle nepoznatog nivoa {g.get('after')}")
        if g.get("implementacija", "js") not in ("js", "3d", "unity"):
            greske.append(f"igra {g.get('id')}: implementacija mora biti js, 3d ili unity")
    return greske


def proveri(dok: dict[str, Any]) -> None:
    greske = greske_sadrzaja(dok)
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
