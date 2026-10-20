"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { confetti, sfx } from "@/lib/jezgro";
import { RENDER, postaviKontekst } from "@/lib/koraci";
import {
  type Dobitak,
  type ZavrsetakOut,
  posaljiOdgovor,
  procenaZrna,
  zapocniNivo,
  zavrsiNivo,
} from "@/lib/napredak";
import { IZAZOVI, type Kurs, type Nivo, md, mnozina } from "@/lib/sadrzaj";
import { Ikona, Svg } from "../Svg";
import { zvezdice } from "./zvezdice";

/** Koraci bez dugmeta "Proveri": odgovor se daje samim dodirom (artifact app.js renderStep). */
const BEZ_DUGMETA = ["tf", "match", "sort", "hotspot", "game"];
const POHVALE = ["Tačno!", "Bravo!", "Tako je!", "Odlično!", "Pravi barista!"];

type Povratna = { klasa: "is-ok" | "is-mid" | "is-bad"; ikona: string; naslov: string; zrna: number; tacno: string; zasto: string };
type Neposlat = { pitanje: string; rezultat: number; vreme: number };

type Props = {
  kurs: Kurs;
  nivo: Nivo;
  dobitak: (d: Dobitak) => void;
  zatvori: () => void;
  /** sledeći nivo posle ekrana rezultata (null: završni test) */
  sledeci: (nivo: Nivo | null) => void;
};

export function Lekcija({ kurs, nivo, dobitak, zatvori, sledeci }: Props) {
  const koraci = nivo.steps;
  const [i, setI] = useState(0);
  const [spremno, setSpremno] = useState(false);
  const [fb, setFb] = useState<Povratna | null>(null);
  const [zrnaProlaz, setZrnaProlaz] = useState(0);
  const [greska, setGreska] = useState("");
  const [rezultat, setRezultat] = useState<ZavrsetakOut | null>(null);
  const [prekid, setPrekid] = useState(false);
  const [zavrsava, setZavrsava] = useState(false);

  const korakRef = useRef<HTMLDivElement>(null);
  const teloRef = useRef<HTMLDivElement>(null);
  const dugmeRef = useRef<HTMLButtonElement>(null);
  const odgovorenoRef = useRef(false);
  const proveraRef = useRef<(() => { frac: number; correct?: string } | undefined) | null>(null);
  const odgovoriRef = useRef<(frac: number, extra?: { correct?: string }) => void>(() => {});
  const pospremiRef = useRef<(() => void)[]>([]);
  const nizRef = useRef(0);
  const pocetakRef = useRef(Date.now());
  // prolaz se otvara na serveru čim lekcija krene; odgovori idu redom, jedan za drugim
  const prolazRef = useRef<Promise<number> | null>(null);
  const lanacRef = useRef<Promise<void>>(Promise.resolve());
  const neposlatiRef = useRef<Neposlat[]>([]);

  const st = koraci[i];
  const izazov = IZAZOVI.includes(st.t);
  const bezDugmeta = BEZ_DUGMETA.includes(st.t);

  useEffect(() => {
    const p = zapocniNivo(kurs.kurs.kljuc, nivo.id).then((r) => r.prolaz_id);
    p.catch((e: Error) => setGreska(e.message));
    prolazRef.current = p;
  }, [kurs.kurs.kljuc, nivo.id]);

  const ugasi = () => {
    pospremiRef.current.forEach((f) => {
      try {
        f();
      } catch {
        /* već ugašeno */
      }
    });
    pospremiRef.current = [];
  };

  const posalji = useCallback(
    (o: Neposlat) => {
      lanacRef.current = lanacRef.current.then(async () => {
        try {
          const id = await prolazRef.current!;
          const r = await posaljiOdgovor(id, o.pitanje, o.rezultat, o.vreme);
          nizRef.current = r.niz;
          dobitak(r);
        } catch (e) {
          neposlatiRef.current.push(o);
          setGreska(`Odgovor nije sačuvan (${(e as Error).message}). Pokušaću ponovo na kraju nivoa.`);
        }
      });
    },
    [dobitak],
  );

  odgovoriRef.current = (frac, extra) => {
    if (odgovorenoRef.current) return;
    odgovorenoRef.current = true;
    frac = Math.max(0, Math.min(1, frac));
    const potpuno = frac >= 0.99;
    const p = procenaZrna(frac, nizRef.current);
    nizRef.current = p.niz;
    if (potpuno) {
      if (p.niz >= 3) sfx.combo(p.niz);
      else sfx.ok();
    } else sfx.bad();
    const naslov = potpuno
      ? p.niz >= 3
        ? `${p.niz} zaredom!`
        : POHVALE[Math.floor(Math.random() * POHVALE.length)]
      : frac >= 0.5
        ? "Skoro!"
        : "Ne baš.";
    setFb({
      klasa: potpuno ? "is-ok" : frac >= 0.5 ? "is-mid" : "is-bad",
      ikona: potpuno ? "check" : frac >= 0.5 ? "target" : "close",
      naslov,
      zrna: p.zrna,
      tacno: extra?.correct ?? "",
      zasto: typeof st.why === "string" ? md(st.why) : "",
    });
    setZrnaProlaz((z) => z + p.zrna);
    posalji({ pitanje: st.id, rezultat: frac, vreme: Date.now() - pocetakRef.current });
  };

  // korak se crta kao u artifactu: html + mount(root, api), van React-ovog stabla
  useLayoutEffect(() => {
    const el = korakRef.current;
    if (!el || rezultat) return;
    ugasi();
    odgovorenoRef.current = false;
    proveraRef.current = null;
    pocetakRef.current = Date.now();
    setFb(null);
    setSpremno(!izazov);
    postaviKontekst({ odgovoreno: () => odgovorenoRef.current, pospremi: (f) => pospremiRef.current.push(f) });
    const R = RENDER[st.t](st);
    const crumb = `<p class="crumb">Nivo ${nivo.n} · ${md(nivo.title)}</p>`;
    el.innerHTML = crumb + R.html;
    R.mount?.(el, {
      ready: (on) => setSpremno(on),
      check: (fn) => (proveraRef.current = fn),
      answer: (frac, extra) => odgovoriRef.current(frac, extra),
    });
    teloRef.current?.scrollTo(0, 0);
    return ugasi;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, rezultat]);

  useEffect(() => {
    if (!bezDugmeta || fb) dugmeRef.current?.focus({ preventScroll: true });
  }, [i, fb, bezDugmeta]);

  async function zavrsi() {
    setZavrsava(true);
    await lanacRef.current;
    // ponovi odgovore koji nisu stigli do servera
    const neposlati = neposlatiRef.current.splice(0);
    if (neposlati.length) {
      setGreska("");
      neposlati.forEach(posalji);
      await lanacRef.current;
    }
    try {
      const r = await zavrsiNivo(await prolazRef.current!);
      dobitak(r);
      setGreska("");
      setRezultat(r);
      sfx.win();
      confetti.burst(r.zvezdice === 3 ? 110 : 50);
    } catch (e) {
      setGreska(`Nivo nije sačuvan: ${(e as Error).message}`);
    } finally {
      setZavrsava(false);
    }
  }

  function dalje() {
    if (izazov && !odgovorenoRef.current) {
      const r = proveraRef.current?.();
      if (r) odgovoriRef.current(r.frac, r);
      return;
    }
    if (i < koraci.length - 1) {
      sfx.tap();
      setI(i + 1);
    } else zavrsi();
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPrekid((p) => !p && !rezultat);
    };
    window.addEventListener("keydown", esc);
    document.body.classList.add("ov-open");
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.classList.remove("ov-open");
    };
  }, [rezultat]);

  if (rezultat) return <Rezultat kurs={kurs} nivo={nivo} r={rezultat} zatvori={zatvori} sledeci={sledeci} />;

  const labela = fb ? "Dalje" : izazov ? "Proveri" : i === koraci.length - 1 ? "Završi" : "Dalje";
  const klasaDugmeta = fb
    ? fb.klasa === "is-ok"
      ? "btn-leaf"
      : fb.klasa === "is-mid"
        ? "btn-gold"
        : "btn-cherry"
    : "btn-gold";

  return (
    <div id="ov">
      <div className="ls" style={{ "--mc": nivo.color } as React.CSSProperties}>
        <div className="ls-top">
          <button type="button" className="icon-btn" aria-label="Prekini" onClick={() => setPrekid(true)}>
            <Ikona ime="close" />
          </button>
          <div
            className="ls-prog"
            role="progressbar"
            aria-label="Napredak"
            aria-valuemin={0}
            aria-valuemax={koraci.length}
            aria-valuenow={i}
          >
            <i style={{ width: `${((i / koraci.length) * 100).toFixed(1)}%` }} />
          </div>
          <span className="ls-xp">
            <Ikona ime="bean" />
            <b>{zrnaProlaz}</b>
          </span>
        </div>
        <div className="ls-body" ref={teloRef}>
          <div className={`step step-${st.t}`} ref={korakRef} />
        </div>
        <div className={`ls-foot${fb ? ` ${fb.klasa}` : ""}`}>
          {greska && (
            <p className="note bad" role="alert">
              <Ikona ime="info" />
              {greska}
            </p>
          )}
          {fb && (
            <div className="fb">
              <p className="fb-h">
                <Ikona ime={fb.ikona} />
                <span>{fb.naslov}</span>
                {fb.zrna > 0 && <em>+{fb.zrna}</em>}
              </p>
              {fb.tacno && <p className="fb-a" dangerouslySetInnerHTML={{ __html: fb.tacno }} />}
              {fb.zasto && <p className="fb-w" dangerouslySetInnerHTML={{ __html: fb.zasto }} />}
            </div>
          )}
          {(!bezDugmeta || fb) && (
            <button
              type="button"
              ref={dugmeRef}
              className={`btn btn-big ${klasaDugmeta} ls-next`}
              disabled={(izazov && !fb && !spremno) || zavrsava}
              onClick={dalje}
            >
              {zavrsava ? "Čuvam…" : labela}
            </button>
          )}
        </div>
      </div>
      {prekid && (
        <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && setPrekid(false)}>
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="msheet">
              <h2 className="h2">Prekinuti nivo?</h2>
              <p className="msheet-d">Zrna koja si skupio ostaju, ali nivo neće biti završen.</p>
              <div className="row2">
                <button type="button" className="btn btn-gold" onClick={() => setPrekid(false)} autoFocus>
                  Nastavi
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    await lanacRef.current;
                    zatvori();
                  }}
                >
                  Prekini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Rezultat({
  kurs,
  nivo,
  r,
  zatvori,
  sledeci,
}: {
  kurs: Kurs;
  nivo: Nivo;
  r: ZavrsetakOut;
  zatvori: () => void;
  sledeci: (n: Nivo | null) => void;
}) {
  const idx = kurs.nivoi.findIndex((n) => n.id === nivo.id);
  const sled = kurs.nivoi[idx + 1] ?? null;
  return (
    <div id="ov">
      <div className="ls res" style={{ "--mc": nivo.color } as React.CSSProperties}>
        <div className="ls-body res-body">
          <div className="res-top">
            <span className="res-ic">
              <Ikona ime={nivo.icon} />
            </span>
            <p className="eyebrow">Nivo {nivo.n} završen</p>
            <h2 className="h1">{nivo.title}</h2>
            <Svg html={zvezdice(r.zvezdice)} />
          </div>
          <div className="res-stats">
            <div>
              <b>{r.tacnost}%</b>
              <span>tačnost</span>
            </div>
            <div>
              <b>+{r.zrna_prolaz}</b>
              <span>zrna</span>
            </div>
            <div>
              <b>{r.niz_dana}</b>
              <span>{mnozina(r.niz_dana, "dan", "dana", "dana")} zaredom</span>
            </div>
          </div>
          <div className="res-next">
            <span>Sledeće</span>
            <b>{sled ? `Nivo ${sled.n} · ${sled.title}` : "Završni test"}</b>
          </div>
        </div>
        <div className="ls-foot">
          {sled && (
            <button type="button" className="btn btn-gold btn-big" onClick={() => sledeci(sled)} autoFocus>
              Sledeći nivo
            </button>
          )}
          <button type="button" className={sled ? "btn btn-ghost" : "btn btn-gold btn-big"} onClick={zatvori}>
            Nazad na put
          </button>
        </div>
      </div>
    </div>
  );
}
