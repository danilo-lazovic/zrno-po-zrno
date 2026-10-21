# Dizajn

`artifact/` je kopija Claude artifacta **Zrno po zrno** (https://claude.ai/artifact/Tg6YmJDquHtHxd6CZ2Cf86), od kog je projekat krenuo. Referenca za izgled i ponašanje polazničke aplikacije, ne kod koji se pokreće.

| Fajl | Šta je | Gde je prešlo |
|---|---|---|
| `index.html` | CSS (tokeni, svetla i tamna tema, svi ekrani) | `frontend/src/app/zrno.css` |
| `content.js` | sadržaj: 8 nivoa, banka pitanja, brza runda, pojmovi, recepti, rangovi, bedževi | `backend/modules/sadrzaj/data/osnovni-nivo.json` (sa dodatim `id`-jevima) |
| `art.js` | ikonice, avatari, interaktivni dijagrami, latte art | `frontend/src/lib/art.ts` |
| `core.js` | pomoćne, zvuk (WebAudio), konfete, kod sertifikata | Modul 1 (zvuk, konfete); kod sertifikata prelazi na server (Modul 3) |
| `games.js` | klipovi i 5 igara na canvasu | Modul 2, po ugovoru iz `frontend/src/igre/ugovor.ts` |
| `app.js` | ekrani, stanje, lekcije, test, profil, panel za trenere | React ekrani, Modul 0 do 3 |
| `img/` | fotografije za kartice priče i recepte | `frontend/public/img/` |

Izgled od 21.10.2026. prati **Kafeterija design system** iz Kafeterija Portala (`kafeterija-portal/design/DESIGN.md`): krem podloga `#f2f0e1`, kartice `#fcfbf3`, tekst i ivice `#171717`, roze brend površina `#f5d8e7`, primarna zelena `#1b7a4c`, ivica 1,5 px sa tvrdom senkom `2px 2px 0`, fontovi Bricolage Grotesque (naslovi) i Hanken Grotesk (tekst i etikete), logo Kafeterije (`frontend/public/brand/`). Samo svetla tema, kao portal.

- **Admin** je isti kao portal: roze sidebar sa logom i grupama, stranice na krem podlozi, tabele i KPI kartice sa tvrdom senkom, pilule u verzalu; na telefonu meni u pilulama.
- **Prijava i pozivnica** su kao prijava u portalu: roze panel sa logom, forma na krem podlozi.
- **Polaznička aplikacija** koristi iste tokene, fontove, ivice i dugmad (pilule), roze zaglavlje kao mobilni portal, ali zadržava igrive elemente iz artifacta (staza zrna, avatari, zrna, konfete, igre) i žutu za naglaske.

Tokeni artifacta (Big Shoulders Display, Onest, Martian Mono, `#F6F1EC`, `#F4AE3D`...) su istorija; stara imena uloga u CSS-u (`--gold`, `--leaf`, `--cherry`) ostala su, sa portalskim vrednostima.
