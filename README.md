# Zrno po zrno

Platforma za obuku barista i zaposlenih Kafeterije: lekcije-priče, izazovi, mini-igre, kartice pojmova i završni test sa sertifikatom; admin deo za trenere i menadžere lokala.

Plan, pravila, uloge, model podataka i redosled modula: **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)**. Referenca dizajna: [design/](design/README.md).

Stack: FastAPI + SQLAlchemy + Alembic + Postgres (backend), Next.js + TypeScript (frontend), isto kao Kafeterija Portal.

## Pokretanje (lokalno, Windows PowerShell ili WSL)

Potrebno: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (pokrenut), Python 3.12+, Node 22+, Git.

Prvi put:

```powershell
git clone https://github.com/danilo-lazovic/zrno-po-zrno.git
cd zrno-po-zrno
copy .env.example .env          # za lokalno radi bez izmena
docker compose up -d db         # Postgres na portu 5433

cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\alembic upgrade head
.venv\Scripts\python seed.py --demo     # kurs, demo nalozi i 12 demo polaznika sa napretkom (~20 s)
.venv\Scripts\uvicorn main:app --reload --port 8001
```

U drugom terminalu:

```powershell
cd zrno-po-zrno\frontend
npm install
npm run dev                     # http://localhost:3001
```

Sledeći put je dovoljno: Docker Desktop upaljen, `docker compose up -d db`, pa `uvicorn` u `backend` i `npm run dev` u `frontend`. Posle `git pull` pokreni još `.venv\Scripts\pip install -r requirements-dev.txt`, `.venv\Scripts\alembic upgrade head` i `npm install`, za slučaj da ima nečeg novog.

(WSL/Linux: `.venv/bin/...` umesto `.venv\Scripts\...`, `cp` umesto `copy`.)

Demo nalozi posle `seed.py --demo`:

| Ko | Prijava | Tajna |
|---|---|---|
| admin | `admin@kafeterija.test` | `SEED_LOZINKA` iz `.env` (`lozinka-za-razvoj`) |
| trener | `trener@kafeterija.test` | isto |
| menadžer (Demo lokal) | `menadzer@kafeterija.test` | isto |
| polaznik bez napretka (Demo lokal) | `demo.polaznik` | PIN `2580` |
| 11 polaznika sa napretkom (Demo lokal i Demo Ušće), npr. `jelena.ilic` (sve položila), `luka.djordjevic` (4 nivoa), `sara.lazic` (1 nivo) | ime.prezime | PIN `2580` |

Osoblje bira „Prijava za osoblje” na `/prijava`; polaznik upisuje korisničko ime i PIN. Demo polaznici bez napretka: `--bez-polaznika`.

Ispočetka (briše bazu): `docker compose down -v`, pa ponovo od `docker compose up -d db`.

Instalacija na telefon i rad bez mreže rade samo u produkcionom buildu: u `frontend` pokreni `npm run build` pa `npm start` (isti port 3001).

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

CI (GitHub Actions, `.github/workflows/ci.yml`) na svakom PR-u i na `main` pušta migracije unapred i unazad, `seed.py --demo`, backend testove na SQLite i Postgresu, frontend typecheck i build. Lokalno isto:

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

## Kako se testira Modul 3

1. Polaznik sa svih 8 završenih nivoa: Put → „Završni test” (ili trofej na kraju staze) → uvod (pitanja, prag, najbolji rezultat, broj pokušaja) → „Kreni na test”.
2. 20 pitanja; posle svakog odgovora server kaže da li je tačno, tačan odgovor i objašnjenje.
3. Ispod 80%: procenat, koliko fali i nivoi za ponavljanje (tap otvara nivo); „Pokušaj ponovo” daje nova pitanja.
4. 80% i više: sertifikat sa kodom `ZP-XXXX-XXXX`, 100 zrna i bedž (samo prvi put). Sertifikat je i u Profilu.
5. Kao trener: Admin → Sertifikati → upiši kod (mala slova i razmaci rade) → ime, lokal, procenat, datum. „Opozovi” traži razlog; polaznik tada u profilu vidi da mora ponovo da položi test i dobija nov kod.
6. Kao menadžer: Polaznici prikazuje procenat i da li je test položen; Sertifikati samo za svoje lokale.

## Kako se testira Modul 4

1. Prijava kao trener ili admin otvara Admin → **Pregled**: broj polaznika, aktivni danas i u 7 dana, završili sve nivoe, položili test; aktivni po danu (prelaz mišem daje broj i zrna, „Tabela” iste brojeve); „Dokle su stigli” po nivoima; zapeli 7+ dana; poređenje lokala (klik na lokal filtrira pregled).
2. **Pitanja**: najteža pitanja prva, sa najčešćim pogrešnim odgovorom; filter lekcije/test i lokal.
3. **Igre**: igranja, igrači, prosečan rezultat, tri zvezdice, igranja iz lekcija i Unity verzije.
4. **Polaznici** → klik na ime: detalj (nivoi sa zvezdicama i tačnošću, najslabija pitanja, test, rekordi u igrama, vremenska linija).
5. Kao menadžer: sve isto, ali samo za polaznike svojih lokala.

## Kako se testira Modul 5

1. Kao trener ili admin: Admin → Sadržaj → **Uredi sadržaj**. Levo su nivoi, pojmovi i podešavanja; za nivo tabovi Koraci, Banka za test, Brza runda, O nivou.
2. Klik na korak otvara formu za njegov tip (izmeni pitanje, ponuđene odgovore i tačan, objašnjenje). Strelice menjaju redosled, „Dodaj korak posle izabranog” dodaje nov.
3. U priči „Otpremi sliku” (JPG, PNG, WebP do 5 MB).
4. **Sačuvaj**: nacrt se čuva, polaznici ga još ne vide. Prazno pitanje se čuva, ali se pojavi spisak grešaka i „Objavi” je zaključano dok se ne ispravi.
5. **Pregled kao polaznik** ili „Pregled od ovog koraka”: lekcija kako je polaznik vidi, ništa se ne upisuje.
6. Dva urednika: ako drugi sačuva u međuvremenu, tvoje čuvanje kaže ko je sačuvao; „Učitaj najnoviji nacrt” učitava njegovu verziju.
7. **Objavi…**: spisak dodatog, izmenjenog i obrisanog, napomena, pa nova verzija. Polaznik je dobija pri sledećem otvaranju; na stranici Sadržaj je nova verzija sa napomenom.
8. Kao menadžer: Sadržaj se ne vidi u meniju, a uređivač vraća na Pregled.

## Kako se testira Modul 6a (aplikacija na telefonu, bez mreže)

Radi samo u produkcionom buildu (`npm run build` pa `npm start`); u `npm run dev` service worker se ne registruje.

1. Na telefonu (Android Chrome) otvori aplikaciju i prijavi se. Profil → Podešavanja → „Aplikacija na telefonu” → **Instaliraj**. Na iPhone-u: Deli → Dodaj na početni ekran.
2. Isključi mrežu (avionski režim) i otvori aplikaciju: otvara se, a gore piše „Bez mreže”.
3. Pređi sledeći nivo: u lekciji piše da se odgovori čuvaju na telefonu, a rezultat kaže „čeka vezu”. Na Putu je nivo završen i sledeći otključan; gore piše koliko stvari čeka.
4. Oceni karticu ili odigraj igru bez mreže: i to ide u red.
5. Uključi mrežu: posle par sekundi stiže „Poslato sa telefona”, a sa njim zrna i bedževi. U adminu se nivo vidi kao završen.
6. Pokreni nivo sa mrežom, pa isključi mrežu usred nivoa: nivo se završava normalno i šalje kad se veza vrati, a zrna se ne dupliraju.
7. Na računaru: Chrome DevTools → Application → Service workers / Cache storage, i Network → Offline.

## Kako se testira Modul 6b (podsetnici)

1. Prijavi se kao demo polaznik koji danas nije učio (npr. `luka.djordjevic`, PIN `2580`). Na Putu je ispod pozdrava kartica sa podsetnikom; u uglu piše koliko ih još ima.
2. „Kasnije” sklanja podsetnik do sutra i pokazuje sledeći, i posle osvežavanja.
3. Započni nivo pa izađi na pola: posle osvežavanja podsetnik je „Nivo N je ostao na pola”, a dugme „Nastavi” otvara taj nivo.
4. Polaznik sa nizom od 2+ dana koji danas nema zrna dobija „Sačuvaj niz”. Posle prve zarade zrna podsetnik prelazi na dnevni cilj.

## Kako se testira Modul 6c (rang lista)

1. Polaznik: na Putu je kartica „N. mesto u lokalu”. Dodir otvara listu kolega iz lokala (ova i prošla nedelja); svoj red je istaknut.
2. Kolege bez zrna te nedelje se ne vide polazniku; ispod liste piše koliko ih je.
3. Admin → **Rang lista**: svi lokali (menadžer samo svoji), izbor nedelje do 4 unazad i lokala; klik na ime otvara detalj polaznika.

## Kako se testira Modul 6d (više kurseva)

1. Kao trener: Admin → Sadržaj → **Nov kurs** (npr. „Meni Kafeterije”; ključ se predloži sam) → otvara se uređivač novog kursa.
2. Dodaj korake u prvi nivo, pa **+ Dodaj nivo**. U „O nivou” se menjaju naziv, ikonica, boja i deo kursa; nov nivo se briše i premešta dok kurs nije objavljen. U Podešavanjima su naziv i opis kursa, nazivi delova i broj pitanja na testu (bar 5, a kurs mora imati toliko pitanja).
3. Sačuvaj pa **Objavi**. Na stranici Sadržaj kurs piše „Objavljen v1”.
4. Kao polaznik: na Putu je dugme „Kurs · Promeni”. U spisku su oba kursa sa napretkom; izbor otvara stazu tog kursa.
5. Preduslov: na stranici Sadržaj za nov kurs izaberi „Položen test: Osnovni nivo”. Polaznik koji nije položio osnovni vidi kurs zaključan i šta ga otključava.
6. U adminu se u meniju bira „Statistika za kurs”: Pregled, Pitanja, Igre i Rang lista prikazuju izabrani kurs.

## 3D igre (proba)

„Kralj pare” u igraonici ima 3D verziju (three.js); prekidač „3D / Klasično” je u zaglavlju igre. Modeli se prave skriptom u Blender-u:

```powershell
# jednom: Python 3.11 i Blender kao modul
py -3.11 -m venv .blender
.blender\Scripts\pip install bpy==4.2.0
# posle izmene skripte:
.blender\Scripts\python frontend\modeli\kralj_pare.py --pregled   # piše public\modeli\kralj-pare.glb i render modeli\kralj-pare-pregled.png
```

Ili u samom Blender-u: Scripting → otvori `frontend/modeli/kralj_pare.py` → Run Script. Model može da se otvori i doradi ručno (File → Import → glTF), pa izveze nazad u `frontend/public/modeli/kralj-pare.glb`; igra traži objekte `Latijera` (sa extras `profil`) i `Stimer`.

## Sadržaj

Sadržaj se menja u uređivaču (Modul 5). JSON u `backend/modules/sadrzaj/data/` je prva verzija i rezervni put za veće izmene:

```powershell
cd backend
.venv\Scripts\python seed.py --samo-sadrzaj    # radi i u produkciji
```

Isti dokument se ne uvozi dvaput; izmenjen pravi novu verziju. Svaki korak i pitanje imaju stabilan `id` (`m3.k07`); ne menjaj postojeće `id`-jeve, jer se na njih vezuju odgovori i statistika. Nov korak dobija nov `id`.
