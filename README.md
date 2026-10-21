# Zrno po zrno

Platforma za obuku barista i zaposlenih Kafeterije: lekcije-priče, izazovi, mini-igre, kartice pojmova i završni test sa sertifikatom; admin deo za trenere i menadžere lokala.

Plan, pravila, uloge, model podataka i redosled modula: **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)**. Referenca dizajna: [design/](design/README.md).

Stack: FastAPI + SQLAlchemy + Alembic + Postgres (backend), Next.js + TypeScript (frontend), isto kao Kafeterija Portal.

## Pokretanje (lokalno, Windows PowerShell ili WSL)

Potrebno: Docker Desktop, Python 3.12+, Node 22+.

```powershell
copy .env.example .env          # pa popuni SECRET_KEY i SEED_LOZINKA
docker compose up -d db         # Postgres na portu 5433

cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\alembic upgrade head
.venv\Scripts\python seed.py --demo     # sadržaj kursa + demo nalozi
.venv\Scripts\uvicorn main:app --reload --port 8001

cd ..\frontend                  # u drugom terminalu
npm install
npm run dev                     # http://localhost:3001
```

(WSL/Linux: `.venv/bin/...` umesto `.venv\Scripts\...`.)

Demo nalozi posle `seed.py --demo`:

| Ko | Prijava | Tajna |
|---|---|---|
| admin | `admin@kafeterija.test` | `SEED_LOZINKA` |
| trener | `trener@kafeterija.test` | `SEED_LOZINKA` |
| menadžer (Demo lokal) | `menadzer@kafeterija.test` | `SEED_LOZINKA` |
| polaznik (Demo lokal) | `demo.polaznik` | PIN `2580` |

Portovi su 3001 (frontend), 8001 (backend) i 5433 (baza), da zrno radi pored Kafeterija Portala (3000, 8000, 5432).

Telefon na istoj mreži: `npm run dev -- -H 0.0.0.0`, pa `http://<IP računara>:3001`. Za pozivne linkove koji rade sa telefona postavi `APP_URL` na tu adresu.

## Lokali iz Kafeterija Portala

U `.env` postavi `PORTAL_URL` (adresa portala) i `PORTAL_KLJUC` (u portalu: Administracija → Ključ za Claude, admin nalog). Zatim Admin → Lokali → „Preuzmi iz portala”, ili:

```powershell
cd backend
.venv\Scripts\python scripts\uvezi_lokale.py --dry-run
.venv\Scripts\python scripts\uvezi_lokale.py
```

Ponovno preuzimanje ažurira nazive i zatvara lokale kojih više nema u portalu.

## Testovi

```powershell
cd backend
.venv\Scripts\python -m pytest              # SQLite u memoriji
$env:TEST_DATABASE_URL="postgresql+psycopg://zrno:zrno_dev@127.0.0.1:5433/zrno_test"; .venv\Scripts\python -m pytest   # pravi Postgres

cd ..\frontend
npm run typecheck
npm run build
```

## Kako se testira Modul 0

1. Prijavi se kao admin (`/prijava` → „Prijava za osoblje”). Lokali → dodaj lokal. Osoblje → otvori nalog menadžeru tog lokala.
2. Polaznici → dodaj polaznika → „Kopiraj poruku sa linkom”. Otvori link (može u privatnom prozoru ili na telefonu).
3. Na linku postavi PIN (1234, 1111 i slični se odbijaju). Otvara se staza sa 8 nivoa; tap na nivo otvara opis nivoa.
4. Odjavi se (Profil), pa se prijavi korisničkim imenom i PIN-om. 5 pogrešnih PIN-ova zaredom = 15 min čekanja; 10 = nalog zaključan.
5. Kao admin/trener: „Novi link” polazniku → stari link i stari PIN više ne rade, polaznik je odjavljen sa telefona.
6. Kao menadžer: vidi samo polaznike svog lokala i dodaje samo u svoj lokal.
7. Sadržaj → objavljena verzija v1 (8 nivoa).

## Kako se testira Modul 1

1. Prijavi se kao polaznik (`demo.polaznik`, PIN `2580` posle `seed.py --demo`). Prvi put: uvod, izbor avatara, pa odmah nivo 1.
2. Prođi nivo: priče, pitanja, klizač, ređanje. Posle svakog izazova vidi se povratna informacija i zrna; od trećeg tačnog zaredom raste bonus. Na kraju: tačnost, zvezdice, zrna, dani zaredom, obaveštenje o bedžu.
3. Prekini nivo na pola (X): zrna ostaju, nivo nije završen. Ponovi nivo: pola bonusa.
4. Staza: završen nivo dobija zvezdice, sledeći se otključava; dnevni cilj (50 zrna) i rang rastu.
5. Kartice: okreni karticu, „Znam” daje 1 zrno samo prvi put; minimum lista se štiklira po završenim nivoima.
6. Profil: bedževi, promena avatara, zvuk.
7. Kao trener ili menadžer: Polaznici prikazuje završene nivoe, zrna i poslednju aktivnost.
8. Kao admin: Lokali → „Preuzmi iz portala” (sa `PORTAL_URL` i `PORTAL_KLJUC`).

## Kako se testira Modul 2

1. Kao polaznik: Igre → igre su zaključane dok se ne završi nivo u kom je gradivo (Brza runda posle nivoa 1, Uštimaj mlin posle 4, Složi recept posle 7, Kralj pare i Sipaj srce posle 8).
2. Otvori otključanu igru i odigraj je. Na kraju: najbolji rezultat (ili „Novi rekord”) i zrna. Posle 5 igranja iste igre u danu igra više ne daje zrna, samo rekord.
3. Brza runda pita samo tvrdnje iz završenih nivoa. 15+ poena daje bedž „Brzi prsti”; 3 zvezdice u Kralju pare ili Sipaj srce daju svoje bedževe.
4. Igra kao korak lekcije (nivoi 5, 7 i 8) se računa i za bedževe, a zrna idu kroz lekciju.
5. Kartica igre u igraonici prikazuje rekord i zvezdice.

## Sadržaj

Kurs je JSON dokument u `backend/modules/sadrzaj/data/`. Posle izmene:

```powershell
cd backend
.venv\Scripts\python seed.py --samo-sadrzaj    # radi i u produkciji
```

Isti dokument se ne uvozi dvaput; izmenjen pravi novu verziju. Svaki korak i pitanje imaju stabilan `id` (`m3.k07`); ne menjaj postojeće `id`-jeve, jer se na njih vezuju odgovori i statistika. Nov korak dobija nov `id`.
