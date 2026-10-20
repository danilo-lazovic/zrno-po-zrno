from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.config import get_settings
from core.db import get_db
from core.models import OSOBLJE, Korisnik, Uloga
from core.security import procitaj_token


def trenutni_korisnik(request: Request, db: Session = Depends(get_db)) -> Korisnik:
    token = request.cookies.get(get_settings().session_cookie)
    procitano = procitaj_token(token) if token else None
    korisnik = db.get(Korisnik, procitano[0]) if procitano else None
    if korisnik is None or not korisnik.aktivan or korisnik.zakljucan:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Nisi prijavljen.")
    if korisnik.sesije_od and procitano[1] < korisnik.sesije_od:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Prijava je istekla, prijavi se ponovo.")
    return korisnik


def zahteva_ulogu(*uloge: Uloga) -> Callable[..., Korisnik]:
    def provera(korisnik: Korisnik = Depends(trenutni_korisnik)) -> Korisnik:
        if korisnik.uloga not in uloge:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Nemaš pristup.")
        return korisnik

    return provera


samo_osoblje = zahteva_ulogu(*OSOBLJE)
samo_admin = zahteva_ulogu(Uloga.admin)
