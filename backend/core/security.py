import hashlib
import re
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from core.config import get_settings

_hasher = PasswordHasher()

# Proverava se i kad nalog ne postoji, da vreme odgovora ne otkriva koja korisnička imena postoje.
_LAZNI_HASH = _hasher.hash("nepostojeci-nalog")

MIN_LOZINKA = 10
PIN = re.compile(r"^\d{4,6}$")


def hash_tajne(tajna: str) -> str:
    """Lozinka osoblja ili PIN polaznika."""
    return _hasher.hash(tajna)


def proveri_tajnu(tajna_hash: str | None, tajna: str) -> bool:
    try:
        return _hasher.verify(tajna_hash or _LAZNI_HASH, tajna) and tajna_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def slab_pin(pin: str) -> bool:
    """1111, 1234, 4321 i slični se pogađaju iz prve."""
    if len(set(pin)) == 1:
        return True
    koraci = {int(b) - int(a) for a, b in zip(pin, pin[1:])}
    return koraci in ({1}, {-1})


def novi_token_pozivnice() -> tuple[str, str]:
    """(token za link, otisak za bazu)."""
    token = secrets.token_urlsafe(24)
    return token, otisak(token)


def otisak(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def trajanje_sesije(polaznik: bool) -> timedelta:
    s = get_settings()
    return timedelta(days=s.sesija_polaznik_dana) if polaznik else timedelta(hours=s.sesija_osoblje_sati)


def napravi_token(korisnik_id: int, polaznik: bool) -> str:
    sada = datetime.now(UTC)
    payload = {
        "sub": str(korisnik_id),
        "iat": sada,
        # iat je u celim sekundama; nova pozivnica u istoj sekundi mora da obori i tu prijavu
        "t": sada.timestamp(),
        "exp": sada + trajanje_sesije(polaznik),
    }
    return jwt.encode(payload, get_settings().secret_key, algorithm="HS256")


def procitaj_token(token: str) -> tuple[int, datetime] | None:
    """(korisnik_id, trenutak prijave) ili None za nevažeći ili istekao token."""
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        return int(payload["sub"]), datetime.fromtimestamp(payload["t"], UTC)
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        return None
