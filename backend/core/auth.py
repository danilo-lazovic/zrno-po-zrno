from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.audit import Akcija, zapisi
from core.config import get_settings
from core.db import get_db
from core.deps import trenutni_korisnik
from core.models import Korisnik, Pozivnica
from core.pristup import vidi_sve_lokale
from core.rate_limit import KliznProzor
from core.schemas import KorisnikOut, LokalOut, MeOut, PinIn, PozivnicaInfo, PrijavaIn
from core.security import PIN, hash_tajne, napravi_token, otisak, proveri_tajnu, slab_pin, trajanje_sesije
from core.vreme import sada

router = APIRouter(prefix="/api")

_settings = get_settings()
login_limiter = KliznProzor(_settings.login_max_pokusaja, _settings.login_prozor_s)

NETACNO = "Pogrešno korisničko ime ili PIN/lozinka."


def normalizuj(korisnicko_ime: str) -> str:
    return korisnicko_ime.strip().lower()


def postavi_sesiju(response: Response, korisnik: Korisnik) -> None:
    trajanje = trajanje_sesije(korisnik.je_polaznik)
    response.set_cookie(
        _settings.session_cookie,
        napravi_token(korisnik.id, korisnik.je_polaznik),
        max_age=int(trajanje.total_seconds()),
        httponly=True,
        secure=_settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/auth/prijava", status_code=status.HTTP_204_NO_CONTENT)
def prijava(body: PrijavaIn, request: Request, response: Response, db: Session = Depends(get_db)):
    ime = normalizuj(body.korisnicko_ime)
    # Iza Next.js proxyja IP je uvek isti, pa je ključ praktično korisničko ime.
    kljuc = f"{request.client.host if request.client else '-'}|{ime}"

    cekaj = login_limiter.preostalo_blokade(kljuc)
    if cekaj:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Previše pogrešnih pokušaja. Pokušaj ponovo za nekoliko minuta.",
            headers={"Retry-After": str(cekaj)},
        )

    korisnik = db.scalar(select(Korisnik).where(Korisnik.korisnicko_ime == ime))
    polaznik = korisnik is not None and korisnik.je_polaznik
    tajna_hash = (korisnik.pin_hash if polaznik else korisnik.lozinka_hash) if korisnik else None
    ok = proveri_tajnu(tajna_hash, body.tajna)

    if korisnik and ok and korisnik.zakljucan:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Nalog je zaključan. Traži novu pozivnicu od trenera.")
    if not (korisnik and ok and korisnik.aktivan):
        login_limiter.zabelezi(kljuc)
        if polaznik and korisnik.pin_hash and not korisnik.zakljucan:
            korisnik.neuspeli_pin += 1
            if korisnik.neuspeli_pin >= _settings.pin_zakljucaj_posle:
                korisnik.zakljucan = True
                zapisi(db, None, Akcija.nalog_zakljucan, korisnik.korisnicko_ime, {"neuspeli_pin": korisnik.neuspeli_pin})
            db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, NETACNO)

    login_limiter.resetuj(kljuc)
    korisnik.neuspeli_pin = 0
    korisnik.poslednja_prijava = sada()
    db.commit()
    postavi_sesiju(response, korisnik)


@router.post("/auth/odjava", status_code=status.HTTP_204_NO_CONTENT)
def odjava(response: Response):
    response.delete_cookie(
        _settings.session_cookie, httponly=True, secure=_settings.cookie_secure, samesite="lax", path="/"
    )


@router.get("/me", response_model=MeOut)
def me(korisnik: Korisnik = Depends(trenutni_korisnik)):
    return MeOut(
        korisnik=KorisnikOut.model_validate(korisnik),
        lokal=LokalOut.model_validate(korisnik.lokal) if korisnik.lokal else None,
        lokali=None if vidi_sve_lokale(korisnik) else [LokalOut.model_validate(lokal) for lokal in korisnik.lokali],
    )


def _vazeca_pozivnica(db: Session, token: str) -> Pozivnica:
    pozivnica = db.scalar(select(Pozivnica).where(Pozivnica.otisak == otisak(token)))
    if (
        pozivnica is None
        or pozivnica.iskoriscena_u is not None
        or pozivnica.ponistena_u is not None
        or pozivnica.istice_u <= sada()
        or not pozivnica.korisnik.aktivan
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Pozivnica ne važi: iskorišćena je, istekla ili zamenjena novom. Traži novu od trenera."
        )
    return pozivnica


@router.get("/pozivnica/{token}", response_model=PozivnicaInfo)
def pozivnica_info(token: str, db: Session = Depends(get_db)):
    pozivnica = _vazeca_pozivnica(db, token)
    k = pozivnica.korisnik
    return PozivnicaInfo(
        ime=k.ime, korisnicko_ime=k.korisnicko_ime, lokal=k.lokal.naziv if k.lokal else None, istice_u=pozivnica.istice_u
    )


@router.post("/pozivnica/{token}", status_code=status.HTTP_204_NO_CONTENT)
def prihvati_pozivnicu(token: str, body: PinIn, response: Response, db: Session = Depends(get_db)):
    pozivnica = _vazeca_pozivnica(db, token)
    if not PIN.match(body.pin):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "PIN ima 4 do 6 cifara.")
    if slab_pin(body.pin):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "PIN je prelak za pogađanje (npr. 1111 ili 1234). Izaberi drugi.")

    k = pozivnica.korisnik
    trenutak = sada()
    k.pin_hash = hash_tajne(body.pin)
    k.neuspeli_pin = 0
    k.zakljucan = False
    k.sesije_od = trenutak
    k.poslednja_prijava = trenutak
    pozivnica.iskoriscena_u = trenutak
    db.commit()
    postavi_sesiju(response, k)
