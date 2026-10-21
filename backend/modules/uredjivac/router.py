"""Uređivač sadržaja: nacrt kursa, čuvanje, pregled izmena, objava nove verzije i slike.

Pravila koja čuvaju napredak i statistiku:
- id postojećeg koraka, pitanja ili pojma se ne menja, niti mu se menja tip (na id se vezuju odgovori);
- nivoi se ne dodaju, ne brišu i ne premeštaju (na njih se vezuju otključavanje, napredak i test).
"""

import hashlib
import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.audit import Akcija, zapisi
from core.config import get_settings
from core.db import get_db
from core.deps import trenutni_korisnik, zahteva_ulogu
from core.models import Korisnik, Uloga
from core.vreme import sada
from modules.sadrzaj.kurs import objavljen_kurs
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


def prekrsaji(staro: dict[str, Any], novo: dict[str, Any]) -> list[str]:
    """Izmene koje bi pokvarile napredak ili statistiku; zbog njih se nacrt ne čuva."""
    out: list[str] = []
    if [n.get("id") for n in staro.get("nivoi", [])] != [n.get("id") for n in novo.get("nivoi", [])]:
        out.append("Nivoi se ne dodaju, ne brišu i ne premeštaju (za njih su vezani napredak i otključavanje).")
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


def _out(db: Session, k: Kurs, n: Nacrt | None) -> NacrtOut:
    objavljen = k.verzija.dokument
    dok = n.dokument if n else objavljen
    autor = db.get(Korisnik, n.izmenio_id) if n and n.izmenio_id else None
    return NacrtOut(
        kurs=k.kljuc,
        dokument=dok,
        revizija=n.revizija if n else 0,
        osnova=k.verzija.broj,
        izmenio=autor.puno_ime if autor else None,
        izmenjen_u=n.izmenjen_u if n else None,
        izmene=izmene(objavljen, dok),
        greske=greske_sadrzaja(dok),
        zauzeti_id=sorted(
            set(stavke(objavljen)) | set(stavke(dok)) | set(db.scalars(select(Pitanje.kljuc).where(Pitanje.kurs_id == k.id)))
        ),
    )


@router.get("/admin/sadrzaj/{kurs}/nacrt", response_model=NacrtOut)
def nacrt(kurs: str, _: Korisnik = Depends(urednik), db: Session = Depends(get_db)):
    k = objavljen_kurs(db, kurs)
    return _out(db, k, _nacrt(db, k))


@router.put("/admin/sadrzaj/{kurs}/nacrt", response_model=NacrtOut)
def sacuvaj(kurs: str, body: NacrtIn, korisnik: Korisnik = Depends(urednik), db: Session = Depends(get_db)):
    k = objavljen_kurs(db, kurs)
    n = _nacrt(db, k)
    if (n.revizija if n else 0) != body.revizija:
        ko = db.get(Korisnik, n.izmenio_id).puno_ime if n and n.izmenio_id else "neko drugi"
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"{ko} je u međuvremenu sačuvao nacrt. Učitaj najnoviji nacrt da vidiš te izmene, pa ponovi svoje."
        )
    if body.dokument.get("kurs", {}).get("kljuc") != k.kljuc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Dokument pripada drugom kursu.")
    los = prekrsaji(k.verzija.dokument, body.dokument)
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
    k = objavljen_kurs(db, kurs)
    n = _nacrt(db, k)
    if n is not None:
        db.delete(n)
        db.commit()


@router.post("/admin/sadrzaj/{kurs}/nacrt/objavi", response_model=ObjavaOut)
def objavi_nacrt(kurs: str, body: ObjavaIn, korisnik: Korisnik = Depends(urednik), db: Session = Depends(get_db)):
    k = objavljen_kurs(db, kurs)
    n = _nacrt(db, k)
    if n is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nema sačuvanog nacrta.")
    if n.osnova_verzija_id != k.verzija_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "U međuvremenu je objavljena druga verzija. Odbaci nacrt i napravi izmene ponovo."
        )
    greske = greske_sadrzaja(n.dokument) + prekrsaji(k.verzija.dokument, n.dokument)
    if greske:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Nacrt ima greške: " + "; ".join(greske))
    spisak = izmene(k.verzija.dokument, n.dokument)
    if not spisak:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Nacrt je isti kao objavljena verzija.")
    v = objavi(db, n.dokument, napomena=body.napomena.strip(), kreirao_id=korisnik.id)
    zapisi(db, korisnik, Akcija.sadrzaj_objavljen, f"{k.kljuc} v{v.broj}",
           {"napomena": body.napomena.strip(), "izmene": [x.model_dump() for x in spisak][:200]})
    db.delete(n)
    db.commit()
    return ObjavaOut(verzija=v.broj, izmena=len(spisak))


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
