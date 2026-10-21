"""Lokali iz Kafeterija Portala.

Portal je izvor istine za spisak lokala (evidencija iz dela za recenzije). Zrno ih čita sa portalovog
API-ja (GET /api/me, admin ključem samo za čitanje) i nikad ne dira bazu portala. Lokal koji
nestane iz portala se ovde zatvara, ne briše, jer za njega ostaju vezani polaznici i istorija.
"""

from dataclasses import dataclass

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import get_settings
from core.models import Lokal


class GreskaPortala(Exception):
    pass


@dataclass
class Rezultat:
    novih: int = 0
    izmenjenih: int = 0
    zatvorenih: int = 0
    ukupno: int = 0


def preuzmi(klijent: httpx.Client | None = None) -> list[dict]:
    """Aktivni lokali iz evidencije portala: [{id, naziv, grad, format}]."""
    s = get_settings()
    if not (s.portal_url and s.portal_kljuc):
        raise GreskaPortala("Nisu podešeni PORTAL_URL i PORTAL_KLJUC (ključ kp_... admin naloga u portalu).")
    klijent = klijent or httpx.Client(timeout=20)
    try:
        r = klijent.get(f"{s.portal_url.rstrip('/')}/api/me", headers={"Authorization": f"Bearer {s.portal_kljuc}"})
    except httpx.HTTPError as e:
        raise GreskaPortala(f"Portal nije dostupan: {e}") from e
    if r.status_code == 401:
        raise GreskaPortala("Portal ne prihvata ključ (opozvan ili vlasnik više nije admin).")
    if r.status_code != 200:
        raise GreskaPortala(f"Portal je vratio {r.status_code}.")
    telo = r.json()
    if not telo.get("svi_lokali"):
        raise GreskaPortala("Ključ ne vidi sve lokale; treba ključ admin naloga.")
    # mock lokali postoje samo u razvoju portala
    return [x for x in telo.get("lokali", []) if x.get("izvor") != "mock"]


def uskladi(db: Session, lokali: list[dict]) -> Rezultat:
    """Upisuje lokale iz portala; commit radi pozivalac."""
    rez = Rezultat(ukupno=len(lokali))
    postojeci = {l.portal_id: l for l in db.scalars(select(Lokal).where(Lokal.portal_id.isnot(None)))}
    po_nazivu = {l.naziv: l for l in db.scalars(select(Lokal))}
    vidjeni: set[int] = set()

    for x in lokali:
        pid, naziv = int(x["id"]), x["naziv"].strip()
        vidjeni.add(pid)
        lokal = postojeci.get(pid)
        if lokal is None:
            # ručno unet lokal istog naziva prelazi pod portal, da polaznici ostanu na njemu
            lokal = po_nazivu.get(naziv)
            if lokal is not None and lokal.portal_id is None:
                rez.izmenjenih += 1
            else:
                lokal = Lokal(naziv=naziv)
                db.add(lokal)
                rez.novih += 1
        elif (lokal.naziv, lokal.grad, lokal.format, lokal.aktivan) != (naziv, x.get("grad"), x.get("format"), True):
            rez.izmenjenih += 1
        lokal.portal_id = pid
        lokal.izvor = "portal"
        lokal.naziv = naziv
        lokal.grad = x.get("grad")
        lokal.format = x.get("format")
        lokal.aktivan = True
        po_nazivu[naziv] = lokal

    for pid, lokal in postojeci.items():
        if pid not in vidjeni and lokal.aktivan:
            lokal.aktivan = False
            rez.zatvorenih += 1
    return rez
