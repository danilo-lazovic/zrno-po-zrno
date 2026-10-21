"use client";

import { useEffect, useState } from "react";
import type { Korak } from "@/lib/sadrzaj";
import { TIPOVI } from "@/lib/uredjivac";
import { Broj, Lista, Slika, Tekst } from "./polja";

type Props = { korak: Korak; promeni: (k: Korak) => void };

/** Forma jednog koraka (ili pitanja iz banke) po tipu. Sve što forma ne pokriva menja se u naprednom JSON-u. */
export function FormaKoraka({ korak: k, promeni }: Props) {
  const set = (polje: string) => (v: unknown) => promeni({ ...k, [polje]: v });
  const zasto = <Tekst naziv="Objašnjenje posle odgovora" vrednost={k.why} promeni={set("why")} vise pomoc="**reč** je podebljano" />;
  const zapamti = <Tekst naziv="Zapamti" vrednost={k.remember} promeni={set("remember")} pomoc="Kratka poruka koja ide i u kartice za ponavljanje." />;
  const pitanje = <Tekst naziv="Pitanje" vrednost={k.q} promeni={set("q")} vise />;
  const naslovTekst = (
    <>
      <Tekst naziv="Naslov" vrednost={k.title} promeni={set("title")} />
      <Tekst naziv="Tekst" vrednost={k.text} promeni={set("text")} vise pomoc="**reč** je podebljano" />
    </>
  );

  let polja: React.ReactNode;
  switch (k.t) {
    case "story":
      polja = (
        <>
          {naslovTekst}
          <Slika vrednost={k.img} promeni={set("img")} />
          {zapamti}
        </>
      );
      break;
    case "mc": {
      const opts = (k.opts as string[]) ?? [];
      polja = (
        <>
          {pitanje}
          <Lista
            naziv="Ponuđeni odgovori (označi tačan)"
            stavke={opts.map((o, i) => ({ o, tacan: i === k.a }))}
            promeni={(s) => promeni({ ...k, opts: s.map((x) => x.o), a: Math.max(0, s.findIndex((x) => x.tacan)) })}
            nova={() => ({ o: "", tacan: false })}
            max={4}
            pomeranje
            red={(s, menjaj, i) => (
              <>
                <input type="radio" name={`tacan-${k.id}`} checked={s.tacan} onChange={() => promeni({ ...k, a: i })} aria-label="Tačan odgovor" />
                <input className="inp" value={s.o} onChange={(e) => menjaj({ ...s, o: e.target.value })} />
              </>
            )}
          />
          {zasto}
        </>
      );
      break;
    }
    case "tf":
      polja = (
        <>
          <Tekst naziv="Tvrdnja" vrednost={k.q} promeni={set("q")} vise />
          <label className="ur-polje ur-kratko">
            <span>Tvrdnja je</span>
            <select className="inp" value={k.a ? "1" : "0"} onChange={(e) => promeni({ ...k, a: e.target.value === "1" })}>
              <option value="1">Tačna</option>
              <option value="0">Netačna</option>
            </select>
          </label>
          {zasto}
        </>
      );
      break;
    case "num": {
      const a = (k.a as number[]) ?? [0, 0];
      polja = (
        <>
          {pitanje}
          <div className="ur-niz">
            <Broj naziv="Od" vrednost={k.min} promeni={set("min")} />
            <Broj naziv="Do" vrednost={k.max} promeni={set("max")} />
            <Broj naziv="Korak" vrednost={k.step} promeni={set("step")} />
            <Broj naziv="Početna vrednost" vrednost={k.start} promeni={set("start")} />
            <Tekst naziv="Jedinica" vrednost={k.unit} promeni={set("unit")} />
          </div>
          <div className="ur-niz">
            <Broj naziv="Tačno od" vrednost={a[0]} promeni={(v) => promeni({ ...k, a: [v, a[1]] })} />
            <Broj naziv="Tačno do" vrednost={a[1]} promeni={(v) => promeni({ ...k, a: [a[0], v] })} />
          </div>
          {zasto}
        </>
      );
      break;
    }
    case "order":
      polja = (
        <>
          {pitanje}
          <Lista
            naziv="Stavke u tačnom redosledu (polaznik ih dobija izmešane)"
            stavke={(k.items as string[]) ?? []}
            promeni={set("items")}
            nova={() => ""}
            pomeranje
            red={(s, menjaj) => <input className="inp" value={s} onChange={(e) => menjaj(e.target.value)} />}
          />
          {zasto}
        </>
      );
      break;
    case "match":
      polja = (
        <>
          {pitanje}
          <Lista
            naziv="Parovi (levo i desno)"
            stavke={(k.pairs as [string, string][]) ?? []}
            promeni={set("pairs")}
            nova={() => ["", ""] as [string, string]}
            red={(s, menjaj) => (
              <>
                <input className="inp" value={s[0]} onChange={(e) => menjaj([e.target.value, s[1]])} aria-label="Levo" />
                <input className="inp" value={s[1]} onChange={(e) => menjaj([s[0], e.target.value])} aria-label="Desno" />
              </>
            )}
          />
          {zasto}
        </>
      );
      break;
    case "sort":
      polja = (
        <>
          {pitanje}
          <div className="ur-niz">
            <Tekst naziv="Leva strana" vrednost={k.left} promeni={set("left")} />
            <Tekst naziv="Desna strana" vrednost={k.right} promeni={set("right")} />
          </div>
          <Lista
            naziv="Stavke i strana na koju idu"
            stavke={(k.items as [string, number][]) ?? []}
            promeni={set("items")}
            nova={() => ["", 0] as [string, number]}
            red={(s, menjaj) => (
              <>
                <input className="inp" value={s[0]} onChange={(e) => menjaj([e.target.value, s[1]])} />
                <select className="inp ur-strana" value={s[1]} onChange={(e) => menjaj([s[0], Number(e.target.value)])} aria-label="Strana">
                  <option value={0}>{String(k.left || "levo")}</option>
                  <option value={1}>{String(k.right || "desno")}</option>
                </select>
              </>
            )}
          />
          {zasto}
        </>
      );
      break;
    case "hotspot":
      polja = (
        <>
          {pitanje}
          <p className="sub">Tačke na crtežu ({String(k.art)}) se menjaju u naprednom JSON-u; crtež je u kodu (lib/art.ts).</p>
        </>
      );
      break;
    default:
      // explore, clip, game: tekstovi ovde, crtež, klip ili igra su u kodu
      polja = (
        <>
          {naslovTekst}
          {k.t !== "game" && zapamti}
          <p className="sub">
            {k.t === "game" ? `Igra „${String(k.game)}“` : k.t === "clip" ? `Klip „${String(k.clip)}“` : `Crtež „${String(k.art)}“`} je u kodu; ovde se
            menjaju tekstovi.
          </p>
        </>
      );
  }

  return (
    <div className="ur-forma">
      <p className="eyebrow">
        {TIPOVI[k.t] ?? k.t} · <span className="mono">{k.id}</span>
      </p>
      {polja}
      <Napredno korak={k} promeni={promeni} />
    </div>
  );
}

/** Ceo korak kao JSON: za polja koja forma ne pokriva (galerija, vremenska linija, crteži). id i tip ostaju isti. */
function Napredno({ korak, promeni }: Props) {
  const tekst = JSON.stringify(korak, null, 2);
  const [nacrt, setNacrt] = useState(tekst);
  const [greska, setGreska] = useState("");
  useEffect(() => {
    setNacrt(tekst);
    setGreska("");
  }, [tekst]);

  function primeni() {
    let v: Korak;
    try {
      v = JSON.parse(nacrt);
    } catch (e) {
      return setGreska(`JSON nije ispravan: ${(e as Error).message}`);
    }
    if (!v || typeof v !== "object" || Array.isArray(v)) return setGreska("Korak mora biti objekat.");
    if (v.id !== korak.id || v.t !== korak.t) return setGreska("id i tip koraka se ne menjaju; za drugi tip dodaj novi korak.");
    setGreska("");
    promeni(v);
  }

  return (
    <details className="ur-napredno">
      <summary>Napredno (JSON)</summary>
      <textarea className="inp" rows={12} value={nacrt} onChange={(e) => setNacrt(e.target.value)} spellCheck={false} />
      {greska && <p className="ur-greska">{greska}</p>}
      <button type="button" className="btn" onClick={primeni} disabled={nacrt === tekst}>
        Primeni JSON
      </button>
    </details>
  );
}
