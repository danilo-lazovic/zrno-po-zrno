# Zrno po zrno - PROJECT_CONTEXT

## Cilj

Platforma za obuku barista i zaposlenih Kafeterije: kratke lekcije-priče, izazovi, mini-igre, kartice pojmova i završni test sa sertifikatom. Polaznik uči sa telefona; trener, menadžer lokala i admin u admin delu prate ko je gde, šta ide teško i ko je spreman za kurs.

Prvi kurs je **Osnovni nivo** (minimum pre kursa uživo): 8 nivoa u 4 dela, 5 igara, 45 pojmova, završni test od 20 pitanja sa pragom 80%.

## Referenca

`design/artifact/` je kopija Claude artifacta "Zrno po zrno" (https://claude.ai/artifact/Tg6YmJDquHtHxd6CZ2Cf86): `index.html` (CSS, tokeni, raspored), `content.js` (sadržaj), `core.js`, `art.js` (ikonice, avatari, dijagrami, latte art), `games.js` (klipovi i igre na canvasu), `app.js` (ekrani), `img/`.

To je referenca za izgled i ponašanje polazničke strane. Artifact čuva napredak samo na telefonu i kod sertifikata računa u browseru; ovde je server izvor istine.

## Arhitektura i stack

Isti obrasci kao Kafeterija Portal, da se održava na isti način i diže na isti server.

- Backend: FastAPI (Python), SQLAlchemy 2, Alembic, Postgres
- Frontend: Next.js (App Router), TypeScript. Browser priča samo sa Next-om (`/api/*` se prosleđuje backendu), pa je sesijski cookie first-party.
- Canvas igre i ilustracije iz artifacta prelaze u TS module bez frameworka (`host` element + opcije), a React ih samo montira i gasi.
- Lokalno: Docker Compose za bazu, Windows i WSL2
- Git od prvog dana

Pravila koja se ne krše:
- **Server je izvor istine** za napredak, zrna, bedževe, test i sertifikat. Klijent šalje šta je polaznik uradio (odgovor, rezultat igre), server računa i čuva.
- **Sadržaj se ne menja ispod napretka.** Svaki korak, pitanje i pojam ima stabilan `id` (`m3.k07`, `m3.b02`, `p.tamp`). Izmena sadržaja pravi novu verziju kursa; odgovori se vezuju za `id`, pa statistika preživljava izmene.
- Menadžer lokala vidi samo polaznike svojih lokala. Filtriranje se radi u upitu u backendu, ne u UI-ju.
- `audit_log` za sve što menja pristup: nov polaznik, nova pozivnica (reset PIN-a), isključenje, promena uloge ili lokala, objava sadržaja.

## Igre i Unity (odluka 20.10.2026.)

- Sajt (polaznik + admin) je Next.js. Unity se NE koristi za ceo sajt: WebGL build je težak (10–30 MB), nestabilan na iOS Safariju, a većina aplikacije su tekst, pitanja, forme i tabele.
- v1: igre (Brza runda, Uštimaj mlin, Složi recept, Kralj pare, Sipaj srce) se prenose iz artifacta kao canvas/JS.
- Svaka igra poštuje isti ugovor, da implementacija može da bude JS ili Unity bez izmene ostatka sistema:
  - ulaz: `igra_id`, konfiguracija nivoa (JSON), podešavanja (zvuk, smanjeno kretanje)
  - izlaz: `{ igra_id, rezultat (0–1), zvezdice (0–3), poeni, trajanje_ms, detalji }`
  - backend prima rezultat preko istog API-ja bez obzira na izvor (`izvor`: `js` ili `unity`, radi poređenja)
- Ugovor je u kodu: `frontend/src/igre/ugovor.ts` (TS tipovi) i `backend/modules/igre/schemas.py` (Modul 2). Igra ne zove API sama; vrati rezultat, a aplikacija ga šalje, dodeljuje zrna i bedževe.
- Unity verzije igara se rade paralelno, jedna po jedna (portfolio). Ugrađuju se kao WebGL komponenta (`react-unity-webgl`) preko JS bridge-a.
- Unity igra menja JS verziju tek kad prođe proveru na telefonima: veličina builda, vreme učitavanja i rad na iOS Safariju. Ako ne prođe, ostaje zaseban portfolio projekat (ili kasnije native app).
- Koja implementacija se koristi za koju igru je podešavanje (`igre[].implementacija` u sadržaju kursa), ne izmena koda.

## Uloge

| Uloga | Prijava | Vidi i radi |
|---|---|---|
| admin | email + lozinka | sve: lokali, osoblje, polaznici, sadržaj, statistika |
| trener | email + lozinka | svi polaznici (dodaje, pozivnice), statistika, sertifikati, pregled sadržaja |
| menadzer | email + lozinka | polaznici svojih lokala (dodaje, pozivnice), njihov napredak |
| polaznik | korisničko ime + PIN | samo svoj napredak (polaznička aplikacija) |

## Prijava polaznika (pozivnica + PIN)

1. Trener ili menadžer doda polaznika (ime, prezime, lokal). Sistem dodeli korisničko ime (`marko.petrovic`, uz broj ako je zauzeto) i napravi pozivni link.
2. Link se šalje polazniku (Viber/WhatsApp). Važi 7 dana i radi jednom.
3. Polaznik na linku vidi svoje ime i korisničko ime, postavi PIN od 4 do 6 cifara i odmah je prijavljen. Sesija polaznika traje 90 dana.
4. Kasnije se prijavljuje korisničkim imenom i PIN-om. Posle 5 pogrešnih pokušaja čeka 15 minuta; posle 10 zaredom nalog se zaključava i treba nova pozivnica.
5. Nova pozivnica briše stari PIN i obara sve otvorene prijave tog polaznika.

Osoblje (admin, trener, menadžer) se prijavljuje emailom i lozinkom (najmanje 10 znakova). Nalog osoblja otvara admin; nema samostalne registracije.

## Sadržaj

- `kursevi`: jedan red po kursu (`osnovni`, kasnije srednji nivo, meni Kafeterije, procedure i higijena...).
- `sadrzaj_verzije`: ceo kurs kao JSON dokument (nivoi, koraci, banka pitanja, brza runda, pojmovi, recepti, igre, rangovi, bedževi, podešavanja). Jedna verzija po kursu je objavljena; polaznici dobijaju nju.
- `pitanja`: indeks svih izazova iz objavljene verzije (id, nivo, tip, tekst), za statistiku po pitanju i izbor pitanja za test bez čitanja JSON-a.
- Izvor prve verzije: `backend/modules/sadrzaj/data/osnovni-nivo.json` (izvučeno iz artifacta, sa dodatim `id`-jevima). `python seed.py` ga uvozi; isti dokument se ne uvozi dvaput.

Format koraka ostaje kao u artifactu (`t`, `q`, `opts`, `a`, `why`, `remember`...), da se ekrani prenose bez prevođenja polja. Tipovi: `story`, `explore`, `clip`, `game`, `mc`, `tf`, `num`, `order`, `match`, `sort`, `hotspot`. Tekst podržava `**podebljano**`.

## Model podataka

Modul 0:
- `lokali`: id, naziv, grad, aktivan
- `korisnici`: id, ime, prezime, korisnicko_ime (unique), email (unique, samo osoblje), uloga, lokal_id (polaznik), lozinka_hash (osoblje), pin_hash (polaznik), neuspeli_pin, zakljucan, aktivan, sesije_od, poslednja_prijava, kreiran_u
- `korisnik_lokal`: menadžer sa više lokala
- `pozivnice`: korisnik_id, otisak tokena (sha256, sam token se ne čuva), istice_u, iskoriscena_u, kreirao_id
- `kursevi`, `sadrzaj_verzije`, `pitanja`
- `audit_log`: ko, kada, akcija, objekat, detalji (json)

Modul 1 i dalje (predlog):
- `upisi`: korisnik_id, kurs_id, verzija_id, upisan_u, zavrsen_u
- `nivo_prolasci`: korisnik, kurs, nivo, pocetak, kraj, tacno, ukupno, zvezdice, greske (json id-jeva)
- `odgovori`: korisnik, pitanje_id, verzija_id, kontekst (lekcija, test, brza runda), tacno, vreme_ms, u
- `zrna`: knjiga zrna (korisnik, iznos, razlog, izvor_id, u); zbir je XP, a dnevni cilj i niz dana se računaju iz nje
- `bedzevi_korisnika`, `igre_rezultati` (igra, poeni, procenat, zvezdice, trajanje)
- `testovi`: pokušaj završnog testa (izvučena pitanja, odgovori, procenat, polozen, pocetak, kraj)
- `sertifikati`: korisnik, kurs, test_id, kod, izdat_u, opozvan_u. Kod se proverava na serveru (strana za trenera i javna provera bez ličnih podataka).
- `kartice_znanje`: korisnik, pojam_id, zna, u

## Admin deo (šta pratimo)

- Pregled: aktivni polaznici danas i ove nedelje, završeni nivoi, položeni testovi, ko je zapeo (bez aktivnosti 7 dana)
- Polaznici: tabela po lokalu (nivo, zrna, niz dana, test, sertifikat), detalj polaznika (vremenska linija, greške po nivou)
- Pitanja: procenat tačnih po pitanju, najteža pitanja, najčešći pogrešan odgovor; signal za popravku sadržaja
- Igre: rezultati i zvezdice
- Lokali: poređenje lokala (za admina i trenera)
- Sertifikati: lista, provera koda, opoziv
- Sadržaj: pregled verzija; kasnije uređivač (nacrt, pregled kao polaznik, objava)

## Moduli i redosled

| # | Modul | Status |
|---|---|---|
| 0 | Kostur: Docker, baza, auth (pozivnica + PIN, lozinka za osoblje), uloge, audit log, sadržaj u bazi + API, admin: lokali, osoblje, polaznici i pozivnice; frontend: prijava, pozivnica, staza nivoa, igre i minimum lista (zaključano), profil, admin (polaznici, lokali, osoblje, sadržaj) | gotovo |
| 1 | Polaznička aplikacija: lekcije (svih 11 tipova koraka), staza, kartice, profil; napredak, zrna, niz dana i bedževi na serveru | sledeće |
| 2 | Igre: Brza runda, Uštimaj mlin, Složi recept, Kralj pare, Sipaj srce; klipovi u lekcijama; rezultati na serveru | |
| 3 | Završni test i sertifikat: izvlačenje na serveru, serverski kod, provera koda, PDF ili slika za deljenje | |
| 4 | Admin statistika: pregled, polaznici, pitanja, igre, lokali | |
| 5 | Uređivač sadržaja: nacrt, pregled kao polaznik, objava nove verzije, slike | |
| 6 | Kasnije: novi kursevi, PWA (instalacija na telefon, rad bez mreže za lekcije), podsetnici, rang lista po lokalu, veza sa lokalima iz portala | |

Posle svakog modula: kratko uputstvo kako se testira, commit, pa sledeći.

## Otvorena pitanja

- Lista lokala: ručno u adminu ili preuzimanje iz Kafeterija Portala (isti nazivi)?
- Ko šalje pozivni link: trener ručno (kopiraj link) ili sistem SMS-om/Viberom?
- Da li menadžer vidi i rezultate testa ili samo da je položen?
- Domen i server (isti VPS kao portal, poddomen tipa `obuka.kafeterija.rs`?)
- Da li polaznici posle Osnovnog nivoa ostaju na platformi (novi kursevi, osvežavanje znanja)?

Valuta nije bitna; vremenska zona Europe/Belgrade (čuva se UTC, prikazuje lokalno). Dan za dnevni cilj i niz dana je kalendarski dan u Beogradu.
