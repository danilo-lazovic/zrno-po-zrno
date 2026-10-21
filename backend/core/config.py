from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+psycopg://zrno:zrno_dev@127.0.0.1:5433/zrno"

    secret_key: str
    session_cookie: str = "zpz_session"
    cookie_secure: bool = False
    # osoblje radi sa računara u kancelariji, polaznik uči sa svog telefona danima
    sesija_osoblje_sati: int = 12
    sesija_polaznik_dana: int = 90

    login_max_pokusaja: int = 5
    login_prozor_s: int = 900
    # posle ovoliko pogrešnih PIN-ova zaredom nalog čeka novu pozivnicu
    pin_zakljucaj_posle: int = 10
    pozivnica_vazi_dana: int = 7

    # javna adresa aplikacije, za pozivne linkove
    app_url: str = "http://localhost:3001"

    seed_lozinka: str | None = None

    # slike koje urednici otpremaju u uređivaču sadržaja (van gita; ide u backup zajedno sa bazom)
    slike_dir: Path = ROOT_DIR / "podaci" / "slike"

    # Kafeterija Portal: lokali se preuzimaju sa njegovog API-ja (GET /api/me), ključem kp_... admin naloga
    # (Administracija → Ključ za Claude, samo čitanje)
    portal_url: str | None = None
    portal_kljuc: str | None = None

    @property
    def produkcija(self) -> bool:
        return self.env == "production"

    @model_validator(mode="after")
    def _produkcija_bez_dev_vrednosti(self):
        if self.produkcija:
            if len(self.secret_key) < 32 or self.secret_key.startswith("zameni-me"):
                raise ValueError("SECRET_KEY mora biti postavljen na dug nasumičan string u produkciji")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE mora biti true u produkciji")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
