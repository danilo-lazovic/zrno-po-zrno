"""Uređivač sadržaja: nacrt kursa, čuvanje, pregled izmena, objava nove verzije i slike.

Pravila koja čuvaju napredak i statistiku:
- id postojećeg koraka, pitanja ili pojma se ne menja, niti mu se menja tip (na id se vezuju odgovori);
- objavljeni nivoi se ne brišu i ne premeštaju (na njih se vezuju otključavanje, napredak i test); nov nivo ide na kraj.
Kurs koji još nije objavljen nema napredak, pa mu se nivoi slobodno menjaju.
"""

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.audit import Akcija, zapisi
from core.config import get_settings
from core.db import get_db
from core.deps import samo_osoblje, trenutni_korisnik, zahteva_ulogu
from core.models import Korisnik, Uloga
from core.vreme import sada
from modules.sadrzaj.models import Kurs, Pitanje
from modules.sadrzaj.uvoz import greske_sadrzaja, objavi
from modules.uredjivac.models import Nacrt

router = APIRouter(prefix="/api")
urednik = zahteva_ulogu(Uloga.admin, Uloga.trener)

SLIKE = {"image/jpeg": (".jpg", b"\xff\xd8\xff"), "image/png": (".png", b"\x89PNG\r\n\x1a\n"), "image/webp": (".webp", b"RIFF")}
MAX_SLIKA_MB = 5
IME_SLIKE = re.compile(r"^[0-9a-f]{16}\.(jpg|png|webp)$")


# ---------- poređenje verzija ----------


def stavke(dok: dict[str, Any]) -> dict[str, tuple[str, dict[str, Any]]]:
    """Sve što ima id: koraci, banka, Brza runda, pojmovi i sami nivoi (meta podaci) → (opis, sadržaj)."""
    out: dict[str, tuple[str, dict[str, Any]]] = {}
    for n in dok.get("nivoi", []):
        meta = {k: v for k, v in n.items() if k not in ("steps", "pool", "swipe")}
        out[n["id"]] = (f"Nivo {n.get('n')} · {n.get('title')}", meta)
        for gde, kljuc in (("korak", "steps"), ("banka", "pool"), ("brza runda", "swipe")):
            for k in n.get(kljuc, []):
                naslov = k.get("q") or k.get("title") or k.get("id")
                out[k["id"]] = (f"{n['id'].upper()} {gde}: {naslov}", k)
    for p in dok.get("pojmovi", []):
        out[p["id"]] = (f"Pojam: {p.get('pojam')}", p)
    out["podesavanja"] = ("Podešavanja testa i dnevnog cilja", dok.get("podesavanja", {}))
    if "kurs" in dok:
        out["kurs"] = ("Naziv i opis kursa", {k: v for k, v in dok["kurs"].items() if k != "kljuc"})
    if "delovi" in dok:
        out["delovi"] = ("Delovi kursa (nazivi i raspored nivoa)", {"delovi": dok["delovi"]})
    return out


class Izmena(BaseModel):
    id: str
    opis: str
    vrsta: str  # dodato, izmenjeno, obrisano


def izmene(staro: dict[str, Any], novo: dict[str, Any]) -> list[Izmena]:
    a, b = stavke(staro), stavke(novo)
    out = [Izmena(id=i, opis=b[i][0], vrsta="dodato") for i in b if i not in a]
    out += [Izmena(id=i, opis=b[i][0], vrsta="izmenjeno") for i in b if i in a and a[i][1] != b[i][1]]
    out += [Izmena(id=i, opis=a[i][0], vrsta="obrisano") for i in a if i not in b]
    # redosled koraka unutar nivoa je izmena nivoa
    for n_novi in novo.get("nivoi", []):
        n_stari = next((n for n in staro.get("nivoi", []) if n["id"] == n_novi["id"]), None)
        if n_stari is None:
            continue
        stari_ids = [k["id"] for k in n_stari.get("steps", [])]
        novi_ids = [k["id"] for k in n_novi.get("steps", [])]
        # dodat ili obrisan korak već je na spisku; redosled se poredi samo među koracima koji postoje u obe verzije
        if [i for i in stari_ids if i in novi_ids] != [i for i in novi_ids if i in stari_ids]:
            if not any(x.id == n_novi["id"] for x in out):
                out.append(Izmena(id=n_novi["id"], opis=f"Nivo {n_novi.get('n')} · {n_novi.get('title')}: redosled koraka", vrsta="izmenjeno"))
    return out


def prekrsaji(staro: dict[str, Any] | None, novo: dict[str, Any]) -> list[str]:
    """Izmene koje bi pokvarile napredak ili statistiku; zbog njih se nacrt ne čuva. Neobjavljen kurs (staro None) nema ograničenja."""
    if staro is None:
        return []
    out: list[str] = []
    stari = [n.get("id") for n in staro.get("nivoi", [])]
    if [n.get("id") for n in novo.get("nivoi", [])][: len(stari)] != stari:
        out.append("Nivoi se ne brišu i ne premeštaju; nov nivo se dodaje na kraj (za nivoe su vezani napredak i otključavanje).")
    a, b = stavke(staro), stavke(novo)
    for i, (_, sadrzaj) in b.items():
        if i in a and "t" in a[i][1] and sadrzaj.get("t") != a[i][1].get("t"):
            out.append(f"{i}: tip postojećeg koraka se ne menja (napravi nov korak i obriši stari).")
    return out


# ---------- nacrt ----------


class NacrtOut(BaseModel):
    kurs: str
    dokument: dict[str, Any]
    # 0: nacrt još nije sačuvan (dokument je objavljena verzija)
    revizija: int
    osnova: int
    izmenio: str | None
    izmenjen_u: datetime | None
    izmene: list[Izmena]
    greske: list[str]
    # svi id-jevi ikad korišćeni u kursu (i obrisani): nov korak ne sme da dobije stari id, da se statistika ne pomeša
    zauzeti_id: list[str]
    # nivoi iz objavljene verzije: ne brišu se i ne premeštaju
    objavljeni_nivoi: list[str]


class NacrtIn(BaseModel):
    dokument: dict[str, Any]
    revizija: int = Field(ge=0)


class ObjavaIn(BaseModel):
    napomena: str = Field(min_length=3, max_length=400)


class ObjavaOut(BaseModel):
    verzija: int
    izmena: int


def _nacrt(db: Session, k: Kurs) -> Nacrt | None:
    return db.scalar(select(Nacrt).where(Nacrt.kurs_id == k.id))


def _kurs(db: Session, kljuc: str) -> Kurs:
    k = db.scalar(select(Kurs).where(Kurs.kljuc == kljuc))
    if k is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kurs ne postoji.")
    return k


def _objavljen(k: Kurs) -> dict[str, Any] | None:
    return k.verzija.dokument if k.verzija else None


def _out(db: Session, k: Kurs, n: Nacrt | None) -> NacrtOut:
    objavljen = _objavljen(k)
    dok = n.dokument if n else objavljen
    if dok is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kurs nema ni objavljenu verziju ni nacrt.")
    autor = db.get(Korisnik, n.izmenio_id) if n and n.izmenio_id else None
    return NacrtOut(
        kurs=k.kljuc,
        dokument=dok,
        revizija=n.revizija if n else 0,
        osnova=k.verzija.broj if k.verzija else 0,
        izmenio=autor.puno_ime if autor else None,
        izmenjen_u=n.izmenjen_u if n else None,
        izmene=izmene(objavljen or {}, dok),
        greske=greske_sadrzaja(dok),
        zauzeti_id=sorted(
            set(stavke(objavljen or {})) | set(stavke(dok)) | set(db.scalars(select(Pitanje.kljuc).where(Pitanje.kurs_id == k.id)))
        ),
        objavljeni_nivoi=[n["id"] for n in (objavljen or {}).get("nivoi", [])],
    )


@router.get("/admin/sadrzaj/{kurs}/nacrt", response_model=NacrtOut)
def nacrt(kurs: str, _: Korisnik = Depends(urednik), db: Session = Depends(get_db)):
    k = _kurs(db, kurs)
    return _out(db, k, _nacrt(db, k))


@router.put("/admin/sadrzaj/{kurs}/nacrt", response_model=NacrtOut)
def sacuvaj(kurs: str, body: NacrtIn, korisnik: Korisnik = Depends(urednik), db: Session = Depends(get_db)):
    k = _kurs(db, kurs)
    n = _nacrt(db, k)
    if (n.revizija if n else 0) != body.revizija:
        ko = db.get(Korisnik, n.izmenio_id).puno_ime if n and n.izmenio_id else "neko drugi"
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"{ko} je u međuvremenu sačuvao nacrt. Učitaj najnoviji nacrt da vidiš te izmene, pa ponovi svoje."
        )
    if body.dokument.get("kurs", {}).get("kljuc") != k.kljuc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Dokument pripada drugom kursu.")
    los = prekrsaji(_objavljen(k), body.dokument)
    if los:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, " ".join(los))
    if n is None:
        n = Nacrt(kurs_id=k.id, osnova_verzija_id=k.verzija_id, revizija=0)
        db.add(n)
    n.dokument = body.dokument
    n.revizija += 1
    n.izmenio_id = korisnik.id
    n.izmenjen_u = sada()
    db.commit()
    return _out(db, k, n)


@router.delete("/admin/sadrzaj/{kurs}/nacrt", status_code=status.HTTP_204_NO_CONTENT)
def odbaci(kurs: str, _: Korisnik = Depends(urednik), db: Session = Depends(get_db)):
    k = _kurs(db, kurs)
    if k.verzija is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Kurs još nije objavljen; nacrt je jedini sadržaj i ne odbacuje se.")
    n = _nacrt(db, k)
    if n is not None:
        db.delete(n)
        db.commit()


@router.post("/admin/sadrzaj/{kurs}/nacrt/objavi", response_model=ObjavaOut)
def objavi_nacrt(kurs: str, body: ObjavaIn, korisnik: Korisnik = Depends(urednik), db: Session = Depends(get_db)):
    k = _kurs(db, kurs)
    n = _nacrt(db, k)
    if n is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nema sačuvanog nacrta.")
    if n.osnova_verzija_id != k.verzija_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "U međuvremenu je objavljena druga verzija. Odbaci nacrt i napravi izmene ponovo."
        )
    greske = greske_sadrzaja(n.dokument) + prekrsaji(_objavljen(k), n.dokument)
    if greske:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Nacrt ima greške: " + "; ".join(greske))
    spisak = izmene(_objavljen(k) or {}, n.dokument)
    if not spisak:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Nacrt je isti kao objavljena verzija.")
    v = objavi(db, n.dokument, napomena=body.napomena.strip(), kreirao_id=korisnik.id)
    zapisi(db, korisnik, Akcija.sadrzaj_objavljen, f"{k.kljuc} v{v.broj}",
           {"napomena": body.napomena.strip(), "izmene": [x.model_dump() for x in spisak][:200]})
    db.delete(n)
    db.commit()
    return ObjavaOut(verzija=v.broj, izmena=len(spisak))


# ---------- kursevi ----------

# za nov kurs: rangovi i bedževi kao u osnovnom (bez bedževa igara, nov kurs nema igre)
SABLON = Path(__file__).resolve().parents[1] / "sadrzaj" / "data" / "osnovni-nivo.json"
BEDZEVI_IGARA = {"dial", "swipe", "milk", "latte", "recipe"}


def nov_dokument(kljuc: str, naziv: str, opis: str | None) -> dict[str, Any]:
    osnovni = json.loads(SABLON.read_text(encoding="utf-8"))
    return {
        "kurs": {"kljuc": kljuc, "naziv": naziv, **({"opis": opis} if opis else {})},
        "podesavanja": {"prag": 0.8, "test_pitanja": 10, "dnevni_cilj": 50},
        "delovi": [{"naziv": "Deo 1", "nivoi": ["m1"]}],
        "rangovi": osnovni["rangovi"],
        "bedzevi": [b for b in osnovni["bedzevi"] if b["id"] not in BEDZEVI_IGARA],
        "nivoi": [{"id": "m1", "n": 1, "title": "Prvi nivo", "icon": "bean", "color": "#7B4A2D", "min": 5, "desc": "",
                   "steps": [], "pool": [], "swipe": []}],
        "igre": [],
        "pojmovi": [],
        "recepti": [],
        "recept_polja": [],
    }


class KursAdminOut(BaseModel):
    kljuc: str
    naziv: str
    opis: str | None
    aktivan: bool
    redosled: int
    preduslov: str | None
    # objavljena verzija; None dok se kurs prvi put ne objavi
    verzija: int | None
    nacrt: bool
    nivoa: int


class KursNovIn(BaseModel):
    kljuc: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{1,39}$")
    naziv: str = Field(min_length=3, max_length=120)
    opis: str | None = Field(default=None, max_length=1000)
    preduslov: str | None = None


class KursIzmenaIn(BaseModel):
    aktivan: bool | None = None
    redosled: int | None = Field(default=None, ge=0, le=1000)
    # kljuc kursa čiji položen test otključava ovaj; "" briše preduslov
    preduslov: str | None = None


def _kurs_out(db: Session, k: Kurs) -> KursAdminOut:
    n = _nacrt(db, k)
    dok = n.dokument if n else _objavljen(k)
    return KursAdminOut(kljuc=k.kljuc, naziv=k.naziv, opis=k.opis, aktivan=k.aktivan, redosled=k.redosled,
                        preduslov=k.preduslov.kljuc if k.preduslov else None, verzija=k.verzija.broj if k.verzija else None,
                        nacrt=n is not None, nivoa=len(dok["nivoi"]) if dok else 0)


def _preduslov(db: Session, k: Kurs | None, kljuc: str) -> Kurs:
    p = db.scalar(select(Kurs).where(Kurs.kljuc == kljuc))
    if p is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Kurs za preduslov ne postoji.")
    # lanac preduslova ne sme da se zatvori u krug (A traži B, B traži A)
    x: Kurs | None = p
    while x is not None:
        if k is not None and x.id == k.id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Preduslov bi napravio krug između kurseva.")
        x = x.preduslov
    return p


@router.get("/admin/kursevi", response_model=list[KursAdminOut])
def svi_kursevi(_: Korisnik = Depends(samo_osoblje), db: Session = Depends(get_db)):
    return [_kurs_out(db, k) for k in db.scalars(select(Kurs).order_by(Kurs.redosled, Kurs.id))]


@router.post("/admin/kursevi", response_model=KursAdminOut, status_code=status.HTTP_201_CREATED)
def nov_kurs(body: KursNovIn, korisnik: Korisnik = Depends(urednik), db: Session = Depends(get_db)):
    """Nov kurs počinje kao nacrt sa jednim praznim nivoom; polaznici ga vide tek posle prve objave."""
    if db.scalar(select(Kurs.id).where(Kurs.kljuc == body.kljuc)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Kurs sa tim ključem već postoji.")
    redosled = (db.scalar(select(func.max(Kurs.redosled))) or 0) + 1
    k = Kurs(kljuc=body.kljuc, naziv=body.naziv.strip(), opis=(body.opis or "").strip() or None, aktivan=True, redosled=redosled)
    if body.preduslov:
        k.preduslov = _preduslov(db, None, body.preduslov)
    db.add(k)
    db.flush()
    db.add(Nacrt(kurs_id=k.id, dokument=nov_dokument(k.kljuc, k.naziv, k.opis), osnova_verzija_id=None, revizija=1,
                 izmenio_id=korisnik.id, izmenjen_u=sada()))
    zapisi(db, korisnik, Akcija.kurs_napravljen, k.kljuc, {"naziv": k.naziv})
    db.commit()
    return _kurs_out(db, k)


@router.patch("/admin/kursevi/{kurs}", response_model=KursAdminOut)
def izmeni_kurs(kurs: str, body: KursIzmenaIn, korisnik: Korisnik = Depends(urednik), db: Session = Depends(get_db)):
    k = _kurs(db, kurs)
    promene = body.model_dump(exclude_none=True)
    if body.aktivan is not None:
        k.aktivan = body.aktivan
    if body.redosled is not None:
        k.redosled = body.redosled
    if body.preduslov is not None:
        k.preduslov = _preduslov(db, k, body.preduslov) if body.preduslov else None
    zapisi(db, korisnik, Akcija.kurs_izmenjen, k.kljuc, promene)
    db.commit()
    return _kurs_out(db, k)


# ---------- slike ----------


class SlikaOut(BaseModel):
    url: str


@router.post("/admin/sadrzaj/slike", response_model=SlikaOut, status_code=status.HTTP_201_CREATED)
async def otpremi_sliku(request: Request, _: Korisnik = Depends(urednik)):
    """Telo zahteva je sama slika (Content-Type: image/jpeg, image/png ili image/webp)."""
    vrsta = request.headers.get("content-type", "").split(";")[0].strip().lower()
    if vrsta not in SLIKE:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Slika mora biti JPG, PNG ili WebP.")
    podaci = await request.body()
    if len(podaci) > MAX_SLIKA_MB * 1024 * 1024:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Slika je veća od {MAX_SLIKA_MB} MB.")
    nastavak, potpis = SLIKE[vrsta]
    if not podaci.startswith(potpis) or (vrsta == "image/webp" and podaci[8:12] != b"WEBP"):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Sadržaj fajla nije slika navedenog tipa.")
    ime = hashlib.sha256(podaci).hexdigest()[:16] + nastavak
    folder = get_settings().slike_dir
    folder.mkdir(parents=True, exist_ok=True)
    putanja = folder / ime
    if not putanja.exists():
        putanja.write_bytes(podaci)
    return SlikaOut(url=f"/api/slike/{ime}")


@router.get("/slike/{ime}")
def slika(ime: str, _: Korisnik = Depends(trenutni_korisnik)):
    putanja = get_settings().slike_dir / ime
    if not IME_SLIKE.match(ime) or not putanja.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Slika ne postoji.")
    # ime je otisak sadržaja, pa se slika nikad ne menja
    return FileResponse(putanja, headers={"Cache-Control": "private, max-age=31536000, immutable"})
