"""Ko koga vidi: admin i trener sve polaznike, menadžer samo polaznike svojih lokala."""

from sqlalchemy import Select, false

from core.models import Korisnik, Uloga


def vidi_sve_lokale(korisnik: Korisnik) -> bool:
    return korisnik.uloga in (Uloga.admin, Uloga.trener)


def dozvoljeni_lokal_ids(korisnik: Korisnik) -> list[int] | None:
    """None znači svi lokali."""
    if vidi_sve_lokale(korisnik):
        return None
    if korisnik.uloga == Uloga.menadzer:
        return [lokal.id for lokal in korisnik.lokali]
    return []


def filtriraj_polaznike(upit: Select, korisnik: Korisnik) -> Select:
    ids = dozvoljeni_lokal_ids(korisnik)
    if ids is None:
        return upit
    if not ids:
        return upit.where(false())
    return upit.where(Korisnik.lokal_id.in_(ids))


def sme_polaznika(korisnik: Korisnik, polaznik: Korisnik) -> bool:
    ids = dozvoljeni_lokal_ids(korisnik)
    return ids is None or polaznik.lokal_id in ids
