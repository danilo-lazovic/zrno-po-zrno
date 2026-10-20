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

Tokeni (boje, fontovi): `--bg #F6F1EC`, `--ink #241510`, `--gold #F4AE3D`, `--cherry #D7263D`, `--leaf #1E9A5D`, `--sky #2D6FD6`; fontovi Big Shoulders Display (naslovi), Onest (tekst), Martian Mono (brojke i oznake). Tamna tema po `prefers-color-scheme`.
