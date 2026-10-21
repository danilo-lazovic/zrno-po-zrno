"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { misc } from "@/lib/art";
import { confetti, esc, num, sfx, shuffle } from "@/lib/jezgro";
import type { Dobitak } from "@/lib/napredak";
import { type Kurs, md } from "@/lib/sadrzaj";
import {
  type OdgovorTesta,
  type PitanjeTesta,
  type ZavrsetakTesta,
  odgovoriNaTest,
  zapocniTest,
  zavrsiTest,
} from "@/lib/test";
import { Ikona, Svg } from "../Svg";
import { SertifikatKartica } from "./SertifikatKartica";

const POHVALE = ["Tačno!", "Bravo!", "Tako je!", "Odlično!", "Pravi barista!"];
const SLOVA = "ABCD";

/** Završni test (artifact app.js openLesson(null, true)): pitanja i provera dolaze sa servera. */
export function Test({
  kurs,
  ime,
  av,
  dobitak,
  zatvori,
  ponoviNivo,
}: {
  kurs: Kurs;
  ime: string;
  av: string | null;
  dobitak: (d: Dobitak) => void;
  zatvori: () => void;
  ponoviNivo: (nivo: string) => void;
}) {
  const [test, setTest] = useState<{ test_id: number; pitanja: PitanjeTesta[] } | null>(null);
  const [i, setI] = useState(0);
  const [izbor, setIzbor] = useState<number | boolean | null>(null);
  const [odg, setOdg] = useState<OdgovorTesta | null>(null);
  const [salje, setSalje] = useState(false);
  const [greska, setGreska] = useState("");
  const [kraj, setKraj] = useState<ZavrsetakTesta | null>(null);
  const [prekid, setPrekid] = useState(false);
  const [pokusaj, setPokusaj] = useState(0);
  const pocetak = useRef(Date.now());
  const niz = useRef(0);

  useEffect(() => {
    setTest(null);
    setKraj(null);
    idiNa(0);
    niz.current = 0;
    zapocniTest(kurs.kurs.kljuc)
      .then(setTest)
      .catch((e: Error) => setGreska(e.message));
  }, [kurs.kurs.kljuc, pokusaj]);

  const q = test?.pitanja[i];

  /** Prelazak na pitanje: odgovor i izbor se brišu u istom renderu, da novo pitanje nikad ne vidi stari odgovor. */
  function idiNa(k: number) {
    setI(k);
    setIzbor(null);
    setOdg(null);
    pocetak.current = Date.now();
  }

  useEffect(() => {
    document.body.classList.add("ov-open");
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !kraj && setPrekid((p) => !p);
    window.addEventListener("keydown", esc);
    return () => {
      document.body.classList.remove("ov-open");
      window.removeEventListener("keydown", esc);
    };
  }, [kraj]);

  async function proveri(odgovor: number | boolean) {
    if (!test || !q || odg || salje) return;
    setSalje(true);
    setGreska("");
    try {
      const r = await odgovoriNaTest(test.test_id, q.id, odgovor, Date.now() - pocetak.current);
      const potpuno = r.rezultat >= 0.99;
      niz.current = potpuno ? niz.current + 1 : 0;
      if (potpuno) {
        if (niz.current >= 3) sfx.combo(niz.current);
        else sfx.ok();
      } else sfx.bad();
      setOdg(r);
    } catch (e) {
      setGreska((e as Error).message);
    } finally {
      setSalje(false);
    }
  }

  async function dalje() {
    if (!test || !q) return;
    if (!odg) {
      if (q.t === "num") proveri(Number(izbor ?? q.start));
      else if (izbor !== null) proveri(izbor);
      return;
    }
    if (i < test.pitanja.length - 1) {
      sfx.tap();
      idiNa(i + 1);
      return;
    }
    setSalje(true);
    try {
      const r = await zavrsiTest(test.test_id);
      dobitak(r);
      setKraj(r);
      if (r.polozen) {
        sfx.win();
        confetti.burst(140);
      } else sfx.bad();
    } catch (e) {
      setGreska((e as Error).message);
    } finally {
      setSalje(false);
    }
  }

  if (kraj) {
    return (
      <Rezultat
        kurs={kurs}
        r={kraj}
        ime={ime}
        av={av}
        zatvori={zatvori}
        ponovo={() => setPokusaj((p) => p + 1)}
        ponoviNivo={ponoviNivo}
      />
    );
  }

  const n = test?.pitanja.length ?? kurs.podesavanja.test_pitanja;
  const potpuno = odg && odg.rezultat >= 0.99;
  const klasa = !odg ? "" : potpuno ? "is-ok" : odg.rezultat >= 0.5 ? "is-mid" : "is-bad";
  return (
    <div id="ov">
      <div className="ls" style={{ "--mc": "var(--gold)" } as React.CSSProperties}>
        <div className="ls-top">
          <button type="button" className="icon-btn" aria-label="Prekini" onClick={() => setPrekid(true)}>
            <Ikona ime="close" />
          </button>
          <div className="ls-prog" role="progressbar" aria-label="Napredak" aria-valuemin={0} aria-valuemax={n} aria-valuenow={i}>
            <i style={{ width: `${((i / n) * 100).toFixed(1)}%` }} />
          </div>
          <span className="ls-xp">
            <Ikona ime="trophy" />
            <b>
              {i + 1}/{n}
            </b>
          </span>
        </div>
        <div className="ls-body">
          {q ? (
            <div className={`step step-${q.t}`} key={q.id}>
              <p className="crumb">
                Završni test · {i + 1}/{n}
              </p>
              <Pitanje q={q} izbor={izbor} setIzbor={setIzbor} odg={odg} proveri={proveri} />
            </div>
          ) : (
            !greska && <p className="sub">Izvlačim pitanja…</p>
          )}
        </div>
        <div className={`ls-foot${klasa ? ` ${klasa}` : ""}`}>
          {greska && (
            <p className="note bad" role="alert">
              <Ikona ime="info" />
              {greska}
            </p>
          )}
          {odg && q && (
            <div className="fb">
              <p className="fb-h">
                <Ikona ime={potpuno ? "check" : odg.rezultat >= 0.5 ? "target" : "close"} />
                <span>
                  {potpuno
                    ? niz.current >= 3
                      ? `${niz.current} zaredom!`
                      : POHVALE[(i + q.id.length) % POHVALE.length]
                    : odg.rezultat >= 0.5
                      ? "Skoro!"
                      : "Ne baš."}
                </span>
              </p>
              {!potpuno && <p className="fb-a" dangerouslySetInnerHTML={{ __html: tacanOdgovor(q, odg) }} />}
              {odg.zasto && <p className="fb-w" dangerouslySetInnerHTML={{ __html: md(odg.zasto) }} />}
            </div>
          )}
          {q && (q.t !== "tf" || odg) && (
            <button
              type="button"
              className={`btn btn-big ${!odg ? "btn-gold" : potpuno ? "btn-leaf" : odg.rezultat >= 0.5 ? "btn-gold" : "btn-cherry"} ls-next`}
              disabled={salje || (!odg && q.t === "mc" && izbor === null)}
              onClick={dalje}
              autoFocus
            >
              {salje ? "Čekam…" : !odg ? "Proveri" : i === n - 1 ? "Završi test" : "Dalje"}
            </button>
          )}
        </div>
      </div>
      {prekid && (
        <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && setPrekid(false)}>
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="msheet">
              <h2 className="h2">Prekinuti test?</h2>
              <p className="msheet-d">Test se neće računati. Sledeći put dobijaš nova pitanja.</p>
              <div className="row2">
                <button type="button" className="btn btn-gold" onClick={() => setPrekid(false)} autoFocus>
                  Nastavi
                </button>
                <button type="button" className="btn" onClick={zatvori}>
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

const fmt = (v: number, step = 1) => num(v, step < 1 ? 1 : 0) as string;

function tacanOdgovor(q: PitanjeTesta, o: OdgovorTesta): string {
  if (q.t === "mc") return `Tačan odgovor: <b>${esc(q.opts![o.resenje as number])}</b>`;
  if (q.t === "tf") return `Tačan odgovor: <b>${o.resenje ? "Tačno" : "Netačno"}</b>`;
  const [lo, hi] = o.resenje as [number, number];
  return `Tačno je: <b>${lo === hi ? fmt(lo, q.step) : `${fmt(lo, q.step)}–${fmt(hi, q.step)}`} ${esc(q.unit ?? "")}</b>`;
}

/** Isti izgled kao pitanja u lekciji (artifact RENDER.mc/tf/num), ali odgovor proverava server. */
function Pitanje({
  q,
  izbor,
  setIzbor,
  odg,
  proveri,
}: {
  q: PitanjeTesta;
  izbor: number | boolean | null;
  setIzbor: (v: number | boolean) => void;
  odg: OdgovorTesta | null;
  proveri: (v: number | boolean) => void;
}) {
  const redosled = useMemo(() => shuffle((q.opts ?? []).map((_, k) => k)) as number[], [q]);
  const naslov = (vrsta: string) => (
    <>
      <p className="eyebrow q-k">{vrsta}</p>
      <h2 className="q" dangerouslySetInnerHTML={{ __html: md(q.q) }} />
    </>
  );

  if (q.t === "mc") {
    return (
      <>
        {q.art && <Svg html={`<div class="art plate art-q">${misc(q.art)}</div>`} />}
        {naslov("Pitanje")}
        <div className="opts" role="radiogroup">
          {redosled.map((oi, k) => {
            const ok = odg && oi === odg.resenje;
            const los = odg && oi === izbor && !ok;
            return (
              <button
                key={oi}
                type="button"
                className={`opt${izbor === oi ? " sel" : ""}${ok ? " ok" : ""}${los ? " bad" : ""}`}
                role="radio"
                aria-checked={izbor === oi}
                disabled={!!odg}
                onClick={() => {
                  sfx.tap();
                  setIzbor(oi);
                }}
              >
                <span className="opt-k">{SLOVA[k]}</span>
                <span>{q.opts![oi]}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (q.t === "tf") {
    const klasa = (v: boolean) => (odg && izbor === v ? (odg.rezultat >= 0.99 ? " ok" : " bad") : "");
    return (
      <>
        {naslov("Tačno ili netačno?")}
        <div className="tf">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              className={`tfb ${v ? "tf-yes" : "tf-no"}${klasa(v)}`}
              disabled={!!odg}
              onClick={() => {
                setIzbor(v);
                proveri(v);
              }}
            >
              <Ikona ime={v ? "check" : "close"} />
              {v ? "Tačno" : "Netačno"}
            </button>
          ))}
        </div>
      </>
    );
  }

  const v = typeof izbor === "number" ? izbor : (q.start ?? q.min ?? 0);
  const stanje = !odg ? "" : odg.rezultat >= 0.99 ? " ok" : odg.rezultat >= 0.5 ? " mid" : " bad";
  return (
    <>
      {naslov("Pomeri klizač")}
      <div className={`num${stanje}`}>
        <output className="num-val" htmlFor="num-range">
          <b>{fmt(v, q.step)}</b> {q.unit}
        </output>
        <input
          type="range"
          id="num-range"
          min={q.min}
          max={q.max}
          step={q.step}
          value={v}
          disabled={!!odg}
          aria-label={q.q}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (n !== v) sfx.tick();
            setIzbor(n);
          }}
        />
        <div className="num-scale" aria-hidden="true">
          <span>
            {fmt(q.min ?? 0, q.step)} {q.unit}
          </span>
          <span>
            {fmt(q.max ?? 0, q.step)} {q.unit}
          </span>
        </div>
      </div>
    </>
  );
}

function Rezultat({
  kurs,
  r,
  ime,
  av,
  zatvori,
  ponovo,
  ponoviNivo,
}: {
  kurs: Kurs;
  r: ZavrsetakTesta;
  ime: string;
  av: string | null;
  zatvori: () => void;
  ponovo: () => void;
  ponoviNivo: (nivo: string) => void;
}) {
  const slabi = kurs.nivoi.filter((n) => r.slabi_nivoi.includes(n.id));
  return (
    <div id="ov">
      <div className="ls res" style={{ "--mc": "var(--gold)" } as React.CSSProperties}>
        <div className="ls-body res-body">
          {r.polozen ? (
            <>
              <div className="res-top">
                <span className="res-ic">
                  <Ikona ime="trophy" />
                </span>
                <p className="eyebrow">Završni test</p>
                <h2 className="h1">Položeno! {r.procenat}%</h2>
                <p className="lead">Spreman si za prvi dan kursa. Pokaži ovaj sertifikat treneru.</p>
              </div>
              {r.sertifikat && <SertifikatKartica ime={ime} av={av} s={r.sertifikat} nivoa={kurs.nivoi.length} />}
            </>
          ) : (
            <>
              <div className="res-top">
                <span className="res-ic bad">
                  <Ikona ime="target" />
                </span>
                <p className="eyebrow">Završni test</p>
                <h2 className="h1">{r.procenat}%</h2>
                <p className="lead">
                  Za prolaz treba {r.prag}%. Fali ti još {r.prag - r.procenat}%. Ponovi slabije nivoe i probaj opet, pitanja se
                  menjaju.
                </p>
              </div>
              {slabi.length > 0 && (
                <div className="weak">
                  <p className="eyebrow">Ponovi ove nivoe</p>
                  {slabi.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="weak-row"
                      style={{ "--mc": n.color } as React.CSSProperties}
                      onClick={() => ponoviNivo(n.id)}
                    >
                      <Ikona ime={n.icon} />
                      <span>
                        Nivo {n.n} · {n.title}
                      </span>
                      <Ikona ime="next" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="ls-foot">
          {r.polozen ? (
            <button type="button" className="btn btn-gold btn-big" onClick={zatvori} autoFocus>
              Gotovo
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-gold btn-big" onClick={ponovo} autoFocus>
                Pokušaj ponovo
              </button>
              <button type="button" className="btn btn-ghost" onClick={zatvori}>
                Nazad na put
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
