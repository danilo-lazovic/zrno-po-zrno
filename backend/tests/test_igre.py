import pytest

from modules.igre.router import IGRANJA_SA_ZRNIMA_DNEVNO, zvezdice_za
from tests.test_napredak import prodji


def posalji(c, igra, rezultat=1.0, poeni=0, **dodatno):
    telo = {"igra_id": igra, "rezultat": rezultat, "zvezdice": 0, "poeni": poeni, "trajanje_ms": 30_000, **dodatno}
    return c.post("/api/igre/osnovni/rezultat", json=telo)


@pytest.fixture
def otkljucano(prijavi, dokument):
    """Ana sa završenih svih 8 nivoa (sve igre otključane)."""
    c = prijavi("ana.a")
    for n in dokument["nivoi"]:
        prodji(c, dokument, n["id"])
    return c


def test_zvezdice_kao_u_artifactu():
    assert [zvezdice_za(x) for x in (1, 0.9, 0.89, 0.7, 0.69, 0.4, 0.39, 0)] == [3, 3, 2, 2, 1, 1, 0, 0]


def test_zakljucana_igra(prijavi, dokument):
    c = prijavi("ana.a")
    r = posalji(c, "swipe")
    assert r.status_code == 403 and "nivoa 1" in r.json()["detail"]
    prodji(c, dokument, "m1")
    assert posalji(c, "swipe", 0.8, 12).status_code == 200
    assert posalji(c, "dialin").status_code == 403
    assert posalji(c, "nema").status_code == 404


def test_zrna_i_rekord(otkljucano):
    c = otkljucano
    pre = c.get("/api/napredak/osnovni").json()["zrna"]
    r = posalji(c, "latte", 0.5).json()
    # 5 + 15 × rezultat; zvezdice računa server iz rezultata, ne veruje poslatim
    assert (r["zrna"], r["zvezdice"], r["najbolje"], r["rekord"]) == (12, 1, 50, False)
    r = posalji(c, "latte", 0.75).json()
    assert (r["zrna"], r["zvezdice"], r["najbolje"], r["rekord"]) == (16, 2, 75, True)
    r = posalji(c, "latte", 0.6).json()
    assert (r["najbolje"], r["rekord"]) == (75, False)
    n = c.get("/api/napredak/osnovni").json()
    assert n["zrna"] == pre + 12 + 16 + 14
    assert n["igre"]["latte"] == {"najbolje": 75, "zvezdice": 2, "igranja": 3}


def test_brza_runda_meri_poene(otkljucano):
    c = otkljucano
    posalji(c, "swipe", 0.9, 11)
    r = posalji(c, "swipe", 0.7, 14).json()
    assert r["najbolje"] == 14 and r["rekord"]
    assert c.get("/api/napredak/osnovni").json()["igre"]["swipe"]["najbolje"] == 14


def test_dnevna_granica_zrna(otkljucano):
    c = otkljucano
    zrna = [posalji(c, "recipe", 1).json()["zrna"] for _ in range(IGRANJA_SA_ZRNIMA_DNEVNO + 2)]
    assert zrna == [20] * IGRANJA_SA_ZRNIMA_DNEVNO + [0, 0]
    # druga igra ima svoju granicu
    assert posalji(c, "milk", 1).json()["zrna"] == 20


@pytest.mark.parametrize(
    "igra, rezultat, poeni, detalji, bedz",
    [
        ("swipe", 0.8, 15, {}, "swipe"),
        ("milk", 0.95, 95, {}, "milk"),
        ("latte", 0.9, 90, {}, "latte"),
        ("dialin", 0.3, 30, {}, "dial"),
        ("recipe", 1, 100, {"perfect": 3}, "recipe"),
    ],
)
def test_bedzevi_igara(otkljucano, igra, rezultat, poeni, detalji, bedz):
    r = posalji(otkljucano, igra, rezultat, poeni, detalji=detalji).json()
    assert bedz in r["novi_bedzevi"]
    assert bedz in otkljucano.get("/api/napredak/osnovni").json()["bedzevi"]


@pytest.mark.parametrize(
    "igra, rezultat, poeni, detalji",
    [("swipe", 1, 14, {}), ("milk", 0.89, 89, {}), ("latte", 0.8, 80, {}), ("dialin", 0.2, 20, {}), ("recipe", 1, 100, {"perfect": 2})],
)
def test_bez_bedza_ispod_praga(otkljucano, igra, rezultat, poeni, detalji):
    assert posalji(otkljucano, igra, rezultat, poeni, detalji=detalji).json()["novi_bedzevi"] == []


def test_recepti_se_sabiraju_kroz_igranja(otkljucano):
    assert posalji(otkljucano, "recipe", 1, detalji={"perfect": 2}).json()["novi_bedzevi"] == []
    assert posalji(otkljucano, "recipe", 0.5, detalji={"perfect": 1}).json()["novi_bedzevi"] == ["recipe"]


def test_igra_iz_lekcije_bez_zrna_ali_sa_bedzom(prijavi, dokument):
    c = prijavi("ana.a")
    # u lekciji igra nije zaključana (deo je nivoa), zrna idu kroz odgovor u lekciji
    r = posalji(c, "dialin", 0.5, 50, kontekst="lekcija").json()
    assert r["zrna"] == 0 and r["novi_bedzevi"] == ["dial"]


def test_izvor_unity_isti_api(otkljucano, db):
    from sqlalchemy import select

    from modules.igre.models import RezultatIgre

    assert posalji(otkljucano, "milk", 0.7, 70, izvor="unity").status_code == 200
    assert db.scalar(select(RezultatIgre.izvor).order_by(RezultatIgre.id.desc())) == "unity"
    assert posalji(otkljucano, "milk", 0.7, 70, izvor="flash").status_code == 422


@pytest.mark.parametrize("polje, vrednost", [("rezultat", 1.5), ("zvezdice", 4), ("poeni", -1), ("trajanje_ms", -5)])
def test_neispravan_rezultat(otkljucano, polje, vrednost):
    telo = {"igra_id": "milk", "rezultat": 1, "zvezdice": 3, "poeni": 1, "trajanje_ms": 1, polje: vrednost}
    assert otkljucano.post("/api/igre/osnovni/rezultat", json=telo).status_code == 422


def test_preveliki_detalji(otkljucano):
    assert posalji(otkljucano, "milk", detalji={"x": "a" * 3000}).status_code == 422


def test_smena_bedz_i_detalji(otkljucano):
    c = otkljucano
    detalji = {"gostiju": 5, "kategorije": {"doza": 1, "sot": 0.5}, "pica": {"kapucino": 0.8}, "napamet": 2}
    r = posalji(c, "smena", 0.85, 640, detalji=detalji).json()
    assert r["zvezdice"] == 2 and r["novi_bedzevi"] == []
    r = posalji(c, "smena", 0.93, 900, detalji=detalji).json()
    # najbolje je procenat, kao za ostale igre (napojnice su poeni)
    assert r["novi_bedzevi"] == ["smena"] and r["najbolje"] == 93
