from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PrijavaIn(BaseModel):
    korisnicko_ime: str = Field(min_length=1, max_length=254)
    # PIN polaznika ili lozinka osoblja
    tajna: str = Field(min_length=1, max_length=256)


class PinIn(BaseModel):
    pin: str = Field(min_length=4, max_length=6)


class LokalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    naziv: str
    grad: str | None
    aktivan: bool


class KorisnikOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ime: str
    prezime: str
    korisnicko_ime: str
    uloga: str


class MeOut(BaseModel):
    korisnik: KorisnikOut
    lokal: LokalOut | None
    # lokali čije polaznike vidi; None za admina i trenera (svi)
    lokali: list[LokalOut] | None


class PozivnicaInfo(BaseModel):
    ime: str
    korisnicko_ime: str
    lokal: str | None
    istice_u: datetime
