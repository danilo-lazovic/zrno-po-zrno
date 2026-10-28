# Zrno po zrno - PROJECT_CONTEXT

## Cilj

Platforma za obuku barista i zaposlenih Kafeterije: kratke lekcije-priče, izazovi, mini-igre, kartice pojmova i završni test sa sertifikatom. Polaznik uči sa telefona; trener, menadžer lokala i admin u admin delu prate ko je gde, šta ide teško i ko je spreman za kurs.

Prvi kurs je **Osnovni nivo** (minimum pre kursa uživo): 8 nivoa u 4 dela, 5 igara, 45 pojmova, završni test od 20 pitanja sa pragom 80%.

## Referenca

`design/artifact/` je kopija Claude artifacta "Zrno po zrno" (https://claude.ai/artifact/Tg6YmJDquHtHxd6CZ2Cf86): `index.html` (CSS, tokeni, raspored), `content.js` (sadržaj), `core.js`, `art.js` (ikonice, avatari, dijagrami, latte art), `games.js` (klipovi i igre na canvasu), `app.js` (ekrani), `img/`.

To je referenca za ponašanje polazničke strane. Artifact čuva napredak samo na telefonu i kod sertifikata računa u browseru; ovde je server izvor istine.

Izgled (od 21.10.2026.): **Kafeterija design system** iz Kafeterija Portala (`kafeterija-portal/design/DESIGN.md`). Admin, prijava i pozivnica su kao portal; polaznička aplikacija ima iste tokene, fontove i dugmad, ali zadržava igrive elemente. Detalji u `design/README.md`.

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
- Ugovor je u kodu: `frontend/src/igre/ugovor.ts` (TS tipovi), `frontend/src/igre/registar.ts` (koja implementacija pokreće koju igru) i `backend/modules/igre/router.py` (`POST /api/igre/{kurs}/rezultat`). Igra ne zove API sama; vrati rezultat, a aplikacija ga šalje, a server dodeljuje zrna i bedževe.
- Ista igra radi u igraonici i kao korak lekcije (konfiguracija `mod: "lekcija"`): lekcija i igraonica zovu samo `pokretac(igra, implementacija)`.
- Unity igra se uključuje upisom njenog pokretača u `UNITY` mapu u `registar.ts` i `implementacija: "unity"` u sadržaju. Dok pokretača nema, sadržaj sa `unity` koristi JS verziju. Build-ovi idu u `frontend/public/unity/<igra>/` (van gita).
- Unity verzije igara se rade paralelno, jedna po jedna (portfolio). Ugrađuju se kao WebGL komponenta (`react-unity-webgl`) preko JS bridge-a.
- Unity igra menja JS verziju tek kad prođe proveru na telefonima: veličina builda, vreme učitavanja i rad na iOS Safariju. Ako ne prođe, ostaje zaseban portfolio projekat (ili kasnije native app).
- Koja implementacija se koristi za koju igru je podešavanje (`igre[].implementacija` u sadržaju kursa), ne izmena koda.

## Smena u Kafeteriji (odluka 21.10.2026.)

- 3D proba (three.js, Blender) je uklonjena: nije davala osećaj prave igre. Pravac je igra u stilu Papa's igara (2D, crtani stil, tok smene), u pregledaču, bez Unity-ja.
- Igra `smena` (`frontend/src/igre/smena/`): Phaser 3, učitava se tek kad se otvori (≈ 330 KB gzip), service worker je pamti za rad bez mreže. Ekran 1080 × 1920, uspravan telefon.
- Tok: kasa (porudžbina) → mlin (doza, tamp, granulacija) → aparat (šolja, tara, šot na vagi i tajmeru) → mleko (vrsta, količina, para: vazduh pa vrtlog, temperatura) → šank (sipanje, crtež, posluženje). Više porudžbina istovremeno; šot teče i dok si na drugoj stanici.
- Gost ocenjuje po stanicama (`model.ts`, `oceni`): doza, tamp, šot (prinos i vreme), procedura (tara), šolja, mleko (vrsta, temperatura, pena, spajanje, mehurići), sipanje (puno, crtež), čekanje. Prosek se umanjuje prema najslabijoj stanici; pogrešna vrsta mleka obara piće. Napojnica raste sa ocenom; +20 din za piće bez otvaranja recepta.
- Rezultat po ugovoru igre: `rezultat` je prosek gostiju, `poeni` su napojnice, `detalji.kategorije` su proseci po stanici. Statistika (Admin → Igre) iz njih pravi prosek po stanici, da trener vidi šta se vežba za šankom.
- Crteži su SVG iz koda (`crtezi.ts`) u Kafeterija stilu: ravne boje, debela crna ivica, tvrda senka; logo iz `public/brand/`. Gosti se slažu iz delova (koža, kosa, frizura, majica, naočare, kapa, brada) sa četiri raspoloženja.
- Vođena smena (od 23.10.2026.): prvi put se nudi kao glavno dugme; jedan gost, bez žurbe, kartica sa uputstvom i žuti krug za svaki korak, ciljne vrednosti vidljive. Rezultat se ne šalje; pamti se na telefonu (`zpz-smena-obuka`). Oprema je u razmeri (`crtezi.PX_CM`, 13 px/cm: šolje po zapremini, korpa 58 mm), mleko je uveličano radi preglednosti.
- Animacije (Phaser tweenovi i čestice, bez fajlova): gosti hodaju i dišu, srećan gost skoči uz srca, ljut se strese; napojnica leti do brojača; stanice klize jedna za drugom; mlin se trese i sipa mrvice; portafilter se ubacuje i izbija o kutiju; pri posluženju tačka postaje srce. Uz „smanjeno kretanje” na telefonu sve to se preskače. Zvuci su iz `sfx` (WebAudio): zvonce, kasa, udarac, klik ručke.
- Igraonica (od 28.10.2026.): Smena, Brza runda i Složi recept. Uštimaj mlin, Kralj pare i Sipaj srce su samo koraci u lekcijama (nivo 5 i 8), jer Smena vežba isto; njihovi bedževi se osvajaju u lekciji. Lista je `SAMO_U_LEKCIJI` u `Polaznik.tsx`.
- Meni je deo sadržaja kursa (`meni`: pića, šolje, vrste mleka; svako piće se otključava posle svog nivoa). Server proverava meni pri objavi. Trenutni meni je privremen dok ne stignu recepture Kafeterije.

## Uloge

| Uloga | Prijava | Vidi i radi |
|---|---|---|
| admin | email + lozinka | sve: lokali, osoblje, polaznici, sadržaj, statistika |
| trener | email + lozinka | svi polaznici (dodaje, pozivnice), statistika, sertifikati, pregled sadržaja |
| menadzer | email + lozinka | polaznici svojih lokala (dodaje, pozivnice), njihov napredak i procenat na testu |
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
- `lokali`: id, naziv, grad, format, aktivan, izvor (portal, rucno, demo), portal_id
- `korisnici`: id, ime, prezime, korisnicko_ime (unique), email (unique, samo osoblje), uloga, lokal_id (polaznik), lozinka_hash (osoblje), pin_hash (polaznik), neuspeli_pin, zakljucan, aktivan, sesije_od, poslednja_prijava, kreiran_u
- `korisnik_lokal`: menadžer sa više lokala
- `pozivnice`: korisnik_id, otisak tokena (sha256, sam token se ne čuva), istice_u, iskoriscena_u, kreirao_id
- `kursevi`, `sadrzaj_verzije`, `pitanja`
- `audit_log`: ko, kada, akcija, objekat, detalji (json)

Modul 1:
- `prolazi_nivoa`: jedan prolazak kroz nivo (verzija sadržaja, poeni, izazova, greške, niz tačnih, zrna, zvezdice, kraj). Bez kraja: prekinut.
- `odgovori`: korisnik, pitanje (id iz sadržaja), nivo, kontekst (lekcija; test i brza runda u modulima 2 i 3), prolaz, rezultat 0–1, vreme_ms
- `zrna`: knjiga zrna (iznos, razlog: odgovor, nivo, kartica, igra, test; objekat; dan po Beogradu). Zbir je XP; dnevni cilj i dani zaredom se računaju iz nje.
- `nivoi_korisnika`: najbolji ishod po nivou (prvi završetak, zvezdice, najbolja tačnost, broj prolazaka)
- `bedzevi_korisnika`, `kartice_korisnika` (zna, nagrađena: zrno samo prvi put)
- `korisnici.avatar`

Modul 2:
- `igre_rezultati`: igra, izvor (js, unity), kontekst (igraonica, lekcija), rezultat, zvezdice (računa server), poeni, trajanje_ms, detalji (json), zrna, dan

Modul 3:
- `testovi`: pokušaj završnog testa (izvučena pitanja redom, početak, kraj, procenat, položen, tačnost po nivou). Bez procenta: prekinut.
- `odgovori.test_id`: odgovori na test idu u istu tabelu (kontekst `test`), pa statistika po pitanju vidi i lekcije i test.
- `sertifikati`: jedan po polazniku i kursu (kod `ZP-XXXX-XXXX`, procenat, izdat, opozvan, ko i zašto).

Modul 4:
- `odgovori.izbor`: šta je polaznik izabrao (mc: indeks ponuđenog odgovora, tf, num), za „najčešći pogrešan odgovor”. Odgovori iz lekcija pre Modula 4 ga nemaju.

Modul 5:
- `sadrzaj_nacrti`: jedan nacrt po kursu (ceo dokument, verzija na kojoj je nastao, revizija, ko i kada je sačuvao). Objava ga briše.
- Slike iz uređivača: fajlovi u `podaci/slike` (van gita; u produkciji trajni volumen), ime je otisak sadržaja.

## Admin deo (šta pratimo)

- Pregled: aktivni polaznici danas i ove nedelje, završeni nivoi, položeni testovi, ko je zapeo (bez aktivnosti 7 dana)
- Polaznici: tabela po lokalu (nivo, zrna, niz dana, test, sertifikat), detalj polaznika (vremenska linija, greške po nivou)
- Pitanja: procenat tačnih po pitanju, najteža pitanja, najčešći pogrešan odgovor; signal za popravku sadržaja
- Igre: rezultati i zvezdice
- Lokali: poređenje lokala (za admina i trenera)
- Sertifikati: lista, provera koda, opoziv
- Sadržaj: pregled verzija i uređivač (nacrt, pregled kao polaznik, objava)

## Moduli i redosled

| # | Modul | Status |
|---|---|---|
| 0 | Kostur: Docker, baza, auth (pozivnica + PIN, lozinka za osoblje), uloge, audit log, sadržaj u bazi + API, admin: lokali, osoblje, polaznici i pozivnice; frontend: prijava, pozivnica, staza nivoa, igre i minimum lista (zaključano), profil, admin (polaznici, lokali, osoblje, sadržaj) | gotovo |
| 1 | Polaznička aplikacija: lekcije (svih 11 tipova koraka, klipovi i igre unutar lekcija), ekran rezultata, uvod sa avatarom, kartice za okretanje, zvuk; napredak, zrna, niz dana i bedževi na serveru; lokali iz portala; napredak u adminu | gotovo |
| 2 | Igraonica: Brza runda, Uštimaj mlin, Složi recept, Kralj pare, Sipaj srce po ugovoru igre (registar JS/Unity); rezultati igraonice i igara iz lekcija na serveru, rekordi, zrna, bedževi igara | gotovo |
| 3 | Završni test i sertifikat: izvlačenje i provera na serveru, sertifikat sa kodom, provera i opoziv koda u adminu, procenat u tabeli polaznika (i za menadžera) | gotovo |
| 4 | Admin statistika: Pregled (aktivnost, levak, zapeli, lokali), Pitanja (najteža, najčešći pogrešan odgovor), Igre, detalj polaznika | gotovo |
| 5 | Uređivač sadržaja: nacrt, forme za svaki tip koraka, banka pitanja, Brza runda, pojmovi, podešavanja, slike, pregled kao polaznik, objava nove verzije sa spiskom izmena | gotovo |
| 6a | Aplikacija na telefonu: instalacija na početni ekran, otvaranje i lekcije, igre i kartice bez mreže, red za slanje | gotovo |
| 6b | Podsetnici u aplikaciji (bez push, SMS i Vibera) | gotovo |
| 6c | Nedeljna rang lista po lokalu | gotovo |
| 6d | Više kurseva: nov kurs iz admina, uređivanje nivoa dok kurs nije objavljen, preduslov, izbor kursa u aplikaciji, statistika po kursu | gotovo |

Posle svakog modula: kratko uputstvo kako se testira, commit, pa sledeći.

## Lokali iz portala (odluka 20.10.2026.)

- Lokali se preuzimaju iz Kafeterija Portala (evidencija iz dela za recenzije). Zrno čita portalov API (`GET /api/me` ključem `kp_…` admin naloga, samo čitanje) i nikad ne dira bazu portala.
- Pokreće se dugmetom Admin → Lokali → „Preuzmi iz portala” ili `python scripts/uvezi_lokale.py`. Lokal se vezuje po `portal_id`; promena naziva u portalu se prenosi, a lokal koji nestane iz portala se ovde zatvara (ne briše, zbog polaznika i istorije).
- Ručno unet lokal istog naziva prelazi pod portal pri prvom preuzimanju, zajedno sa svojim polaznicima. Lokal iz portala se ne menja u zrnu.
- Menadžer vidi procenat na testu svojih polaznika (Modul 3).

## Bodovanje (isto kao artifact, računa server)

- Odgovor: `10 × rezultat` zrna; tačan odgovor produžava niz, od trećeg zaredom bonus `min(10, (niz − 2) × 2)`. Pogrešan ili delimičan prekida niz i broji se kao greška.
- Kraj nivoa: zvezdice 3 (≥ 90%), 2 (≥ 70%), 1; bonus 20 + 20 bez greške, pola bonusa za ponovljen nivo. Zrna od odgovora ostaju i kad se nivo prekine.
- Kartica „Znam” daje 1 zrno samo prvi put po pojmu.
- Bedževi: prvi nivo, nivo bez greške, 5 tačnih zaredom, 3 dana zaredom, 4 nivoa, sve zvezdice; bedž testa u Modulu 3.
- Igre (Modul 2): igraonica daje `5 + 15 × rezultat` zrna za prvih 5 igranja iste igre u danu (artifact nije imao granicu, pa se Brza runda mogla vrteti radi zrna); posle toga se igra za rekord. Igra kao korak lekcije ne daje zrna posebno (zrna idu kroz odgovor u lekciji), ali se beleži i računa za bedževe. Zvezdice (≥ 90% 3, ≥ 70% 2, ≥ 40% 1) računa server iz rezultata. Rekord: poeni za Brzu rundu, procenat za ostale.
- Bedževi igara: Brzi prsti (15+ poena u Brzoj rundi), Kralj pare i Srce iz prve (3 zvezdice), Dial-in majstor (Uštimaj mlin, rezultat iznad 20%), Recept-mašina (ukupno 3 recepta bez greške, i iz lekcija).
- Dani zaredom: dani (Beograd) sa bar jednim zrnom; niz traje dok je poslednji takav dan danas ili juče.
- Tačnost odgovora u lekciji javlja klijent (odgovori su u sadržaju koji telefon ima).

## Završni test i sertifikat (Modul 3)

- Otključava se kad su završeni svi nivoi (proverava server).
- Server izvlači 20 pitanja (mc, tf, num iz lekcija i iz banke): po dva iz svakog nivoa, ostatak nasumično. Telefon dobija pitanja bez tačnih odgovora i objašnjenja; posle svakog odgovora server vraća rezultat, tačan odgovor i objašnjenje. Banka pitanja nikad ne ide na telefon.
- Ocena kao u lekciji: tačno 1; klizač u blizini (6% opsega) 0,5. Prolaz: 80% (`podesavanja.prag` u sadržaju).
- Odgovori na testu ne donose zrna (da se test ne ponavlja radi zrna); prvi položen test donosi 100 zrna i bedž „Spreman za kurs”.
- Nov pokušaj prekida nedovršen. Pad: predlog nivoa za ponavljanje (tačnost ispod 75%).
- Sertifikat: jedan po polazniku i kursu. Bolji rezultat menja procenat, kod ostaje isti. Trener ili admin može da opozove sertifikat (sa razlogom, u audit logu); posle opoziva nov položen test daje nov kod.
- Kod `ZP-XXXX-XXXX` (bez slova koja se mešaju: 0/O, 1/I/L, U/V) trener proverava u Admin → Sertifikati; unos prašta mala slova, razmake i izostavljene crtice. Menadžer proverava i vidi samo polaznike svojih lokala.
- Javna provera koda bez prijave i PDF/slika za deljenje: kasnije, ako zatreba (sada polaznik šalje screenshot iz profila).

## Statistika (Modul 4)

- Računa se samo nad aktivnim nalozima polaznika koje korisnik sme da vidi; menadžer vidi samo svoje lokale (i filter po lokalu mu ne otvara tuđe).
- Aktivan dan: dan (Beograd) sa bar jednim odgovorom, igrom ili zrnom. „Aktivnih 7 dana”: bar jedan takav dan u poslednjih 7.
- Zapeo: postavio PIN, nije položio test i nema aktivnosti 7+ dana (računa se i od prijave ili otvaranja naloga ako nikad nije učio).
- Levak: koliko polaznika je postavilo PIN, završilo svaki nivo i položilo test; procenat je u odnosu na prvi red.
- Pitanja: tačnost je prosek rezultata (0–1) svih odgovora; prikazuju se pitanja sa bar 3 odgovora, najteža prva. Najčešći pogrešan odgovor se vidi za izbor i klizač.
- Igre: igranja iz igraonice i iz lekcija, prosečan rezultat, udeo igranja sa 3 zvezdice, broj igranja Unity verzije. Za Smenu i prosek po stanici.
- Grafikoni: jedna serija u boji `--graf` (#2D6FD6 svetlo, #5A92EC tamno; provereno validatorom palete), broj na najvišem i poslednjem stubiću, ostalo u oblačiću, „Tabela” za iste brojeve kao tekst.

## Uređivač sadržaja (Modul 5)

- Uređuju admin i trener. Rade na nacrtu kursa; polaznici vide objavljenu verziju dok se nacrt ne objavi.
- Čuvanje nosi broj revizije: ako je neko drugi sačuvao u međuvremenu, čuvanje se odbija (409) umesto da pregazi tuđe izmene.
- Nacrt sa greškama se čuva, ali se ne objavljuje. Provera pre objave: polja svakog tipa koraka (pitanje, bar dva ponuđena odgovora i tačan među njima, opseg klizača, stavke za ređanje i parove...), Brza runda, pojmovi, podešavanja (prag 0.5–1, 5–50 pitanja na testu, dnevni cilj 10–1000) i da u kursu ima dovoljno pitanja za test.
- Zaštite napretka i statistike: nivoi se ne dodaju, ne brišu i ne premeštaju; postojećem koraku se ne menja `id` ni tip; nov korak dobija sledeći slobodan `id`, a obrisani `id` se nikad ne koristi ponovo. Koraci unutar nivoa se slobodno dodaju, brišu i premeštaju.
- Objava traži napomenu i prikazuje šta je dodato, izmenjeno i obrisano (računa server). Pravi novu verziju, usklađuje indeks `pitanja` (obrisana pitanja postaju neaktivna i ostaju u statistici) i upisuje se u audit log. Napredak, zrna i sertifikati ostaju.
- Crteži, klipovi i igre su kod (`art.ts`, `igre.ts`): uređivač menja njihove tekstove, a ostala polja svakog koraka su u „Napredno (JSON)”. Novi tipovi koraka iz uređivača: priča, izbor, tačno/netačno, klizač, ređanje, spajanje, prevlačenje.
- Slike: JPG, PNG ili WebP do 5 MB, proverava se i sadržaj fajla, ne samo tip; služe se samo prijavljenima.
- Pregled kao polaznik: isti ekran lekcije, nad nacrtom, bez ijednog poziva serveru.
- `seed.py --samo-sadrzaj` i dalje radi; ako pravi novu verziju dok postoji nacrt, objava nacrta se odbija dok se nacrt ne odbaci (nastao je na staroj verziji).

## Modul 6 (odluke 21.10.2026.)

- Redosled: aplikacija na telefonu, podsetnici, rang lista, više kurseva; svaki deo je poseban PR.
- Podsetnici samo u aplikaciji: bez push notifikacija, SMS-a i Vibera (polaznici nemaju email, a SMS/Viber koštaju po poruci).
- Rang lista: zrna ove nedelje (ponedeljak–nedelja, Beograd), samo kolege iz istog lokala.
- Kursevi: sadržaj za drugi kurs još ne postoji; pravi se infrastruktura sa jednim malim probnim kursom.

## Aplikacija na telefonu i rad bez mreže (Modul 6a)

- Instalacija: manifest i ikone. Android i Chrome nude „Instaliraj” u Profilu; iPhone dobija uputstvo Deli → Dodaj na početni ekran.
- Service worker (`frontend/public/sw.js`): JS i CSS buildova, slike kursa, ikone i fontovi idu u keš. Početna strana i API koji polaznik čita (me, sadržaj, napredak, stanje testa) idu prvo na mrežu, a bez mreže se koristi poslednji sačuvan odgovor. Admin uvek ide na mrežu. Banka pitanja ne stiže na telefon, pa je nema ni u kešu.
- Uslov: aplikacija se otvara bez mreže tek pošto je jednom otvorena sa mrežom posle prijave.
- Red za slanje (`frontend/src/lib/red.ts`, localStorage, posebno po korisniku): nivo pređen bez mreže, rezultat igre i ocena kartice. Šalje se redom pri otvaranju aplikacije, kad se veza vrati i na 30 s dok nešto čeka. Stavka koju server odbije (npr. pitanje izbačeno u novoj verziji sadržaja) izbacuje se iz reda, a polaznik dobija obaveštenje.
- Nivo bez mreže ide jednim zahtevom (`POST /api/napredak/{kurs}/nivoi/{nivo}/sinhronizacija`):
  - nosi ključ sa telefona, pa isti nivo poslat dvaput (izgubljen odgovor servera) ne daje zrna dvaput;
  - ako je nivo započet sa mrežom pa je veza pukla, nastavlja se isti prolaz i već upisani odgovori se preskaču;
  - obračun je isti kao sa mrežom;
  - upisuje se vreme kada je nivo pređen (za niz dana i dnevni cilj), najviše 3 dana unazad i nikad u budućnosti.
- Do slanja aplikacija prikazuje nivo kao završen (sledeći se otključava), a zrna, bonus i bedževi stižu sa servera posle slanja.
- Završni test traži mrežu (pitanja izvlači i proverava server).
- Odjava briše sačuvane stranice i podatke iz keša. Red ostaje na telefonu i šalje se kad se isti polaznik ponovo prijavi.

## Podsetnici (Modul 6b)

Vide se kad polaznik otvori aplikaciju, kao kartica na Putu ispod pozdrava. Prikazuje se jedan, najvažniji; „Kasnije” ga sklanja do sutra (po danu u Beogradu, na tom telefonu) i pokazuje sledeći. Pravila (`frontend/src/lib/podsetnici.ts`), po važnosti:

1. Niz u opasnosti: niz od 2+ dana, a danas još nema zrna.
2. Nivo ostavljen na pola: započet u poslednjih 7 dana i nije završen.
3. Povratak posle pauze: poslednji dan sa zrnima pre 3+ dana.
4. Kartice za ponavljanje: 3+ pojma iz završenih nivoa označena sa „Ponovi”.
5. Nivo sa jednom zvezdicom, dok test nije položen.
6. Dnevni cilj: danas ima zrna, ali manje od cilja.

Kad su svi nivoi gotovi, nema posebnog podsetnika za test: Put tada ionako ima veliko dugme za test. Server za ovo daje `poslednji_dan` i `nedovrsen` u napretku.

## Rang lista (Modul 6c)

- Nedelja je od ponedeljka do nedelje po Beogradu; poredi se zbir zrna iz te nedelje (lekcije, igre, kartice, test). Svakog ponedeljka svi kreću od nule.
- U listi su aktivni polaznici iz istog lokala sa postavljenim PIN-om. Isti broj zrna daje isto mesto (1, 1, 3).
- Polaznik vidi kolege koje su te nedelje zaradile zrna i sebe, sa imenom i inicijalom prezimena, ovu i prošlu nedelju. Polaznik bez lokala nema rang listu.
- Osoblje (Admin → Rang lista) vidi ceo lokal sa punim imenima i polaznike bez zrna, do 4 nedelje unazad; menadžer samo svoje lokale.

## Više kurseva (Modul 6d)

- Kurs pravi admin ili trener (Admin → Sadržaj → Nov kurs): ključ (u adresi), naziv, opis i preduslov. Nov kurs počinje kao nacrt sa jednim praznim nivoom; rangovi i bedževi su kao u osnovnom, bez bedževa igara. Polaznici ga vide tek posle prve objave.
- Dok kurs nije objavljen, nivoi se slobodno dodaju, brišu i premeštaju. Posle objave objavljeni nivoi ostaju gde jesu, a nov nivo se dodaje na kraj. Delovi kursa (grupe nivoa na stazi) prate redosled nivoa; svaki nivo mora biti u tačno jednom delu.
- Preduslov: kurs se otključava kad polaznik ima važeći sertifikat drugog kursa (opoziv ga ponovo zaključava). Server to proverava pri početku nivoa i testa; zaključan kurs se vidi u spisku sa porukom šta ga otključava. Lanac preduslova ne sme da se zatvori u krug.
- Kurs se može sakriti (ne vidi se polaznicima, napredak ostaje) i premeštati u spisku.
- Polaznik: kad ima više objavljenih kurseva, na Putu bira kurs. Izbor se pamti na telefonu, a ako taj kurs više nije otključan, otvara se prvi otključan koji nije položen. Zrna, nivoi, bedževi, test, sertifikat, rang lista i podsetnici su po kursu.
- Admin: kad ima više objavljenih kurseva, u meniju se bira kurs za statistiku (Pregled, Pitanja, Igre, Rang lista, detalj polaznika). Sertifikati imaju kolonu Kurs.
- Igre su vezane za gradivo osnovnog kursa; nov kurs ih zasad nema.

## Otvorena pitanja

- Domen: preskočeno dok se ne nabavi (isti server kao portal).
- Ko šalje pozivni link: trener ručno (kopiraj link) ili sistem SMS-om/Viberom?
- Da li polaznici posle Osnovnog nivoa ostaju na platformi (novi kursevi, osvežavanje znanja)?

Valuta nije bitna; vremenska zona Europe/Belgrade (čuva se UTC, prikazuje lokalno). Dan za dnevni cilj i niz dana je kalendarski dan u Beogradu.
