"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { avatar, BEAN, icon, medal } from "@/lib/art";
import { api } from "@/lib/api";
import { IZAZOVI, type Kurs, type Nivo, type SadrzajOut, md, mnozina, rangZa } from "@/lib/sadrzaj";
import type { Me } from "@/lib/types";
import { Odjava } from "../Odjava";
import { Ikona, Svg } from "../Svg";

const KURS = "osnovni";

/** Napredak polaznika. U Modulu 1 dolazi sa servera (GET /api/napredak/osnovni); do tada je prazan. */
type Napredak = {
  zrna: number;
  niz_dana: number;
  najduzi_niz: number;
  danas_zrna: number;
  nivoi: Record<string, { zavrsen: boolean; zvezdice: number }>;
  bedzevi: string[];
  test: { najbolje: number; polozen: boolean };
};

const PRAZAN: Napredak = {
  zrna: 0,
  niz_dana: 0,
  najduzi_niz: 0,
  danas_zrna: 0,
  nivoi: {},
  bedzevi: [],
  test: { najbolje: 0, polozen: false },
};

type Tab = "put" | "igre" | "kartice" | "profil";
const TABS: [Tab, string, string][] = [
  ["put", "Put", "path"],
  ["igre", "Igre", "arcade"],
  ["kartice", "Kartice", "cards"],
  ["profil", "Profil", "user"],
];

const zrnaTxt = (n: number) => `${n} ${mnozina(n, "zrno", "zrna", "zrna")}`;
const danaTxt = (n: number) => `${n} ${mnozina(n, "dan", "dana", "dana")}`;

function zvezdice(n: number) {
  let h = `<span class="srow" aria-label="${n} od 3 zvezdice">`;
  for (let i = 0; i < 3; i++) h += `<span class="${i < n ? "on" : ""}">${icon("star")}</span>`;
  return h + "</span>";
}

export function Polaznik({ me }: { me: Me }) {
  const [kurs, setKurs] = useState<Kurs | null>(null);
  const [greska, setGreska] = useState("");
  const [tab, setTab] = useState<Tab>("put");
  const [list, setList] = useState<Nivo | null>(null);
  const napredak = PRAZAN;

  useEffect(() => {
    api<SadrzajOut>(`/api/sadrzaj/${KURS}`)
      .then((r) => setKurs(r.dokument))
      .catch((e: Error) => setGreska(e.message));
  }, []);

  const idi = (t: Tab) => {
    setTab(t);
    window.scrollTo(0, 0);
  };

  if (greska) {
    return (
      <div id="app">
        <p className="note bad">{greska}</p>
      </div>
    );
  }
  if (!kurs) return <div id="app" aria-busy="true" />;

  const rang = rangZa(kurs, napredak.zrna);
  return (
    <div id="app">
      <header className="top">
        <button type="button" className="top-me" onClick={() => idi("profil")} aria-label="Profil">
          <Svg html={avatar("zrno")} />
          <span className="top-rank">
            <small>{me.korisnik.ime}</small>
            <b>{rang.naziv}</b>
          </span>
        </button>
        <div className="top-stats">
          <span className="stat flame" title="Dani zaredom">
            <Ikona ime="flame" />
            <b>{napredak.niz_dana}</b>
          </span>
          <span className="stat bean" title="Zrna">
            <Ikona ime="bean" />
            <b>{napredak.zrna}</b>
          </span>
        </div>
      </header>
      <main id="view" className={`view view-${tab}`}>
        {tab === "put" && <Put kurs={kurs} me={me} napredak={napredak} otvori={setList} />}
        {tab === "igre" && <Igre kurs={kurs} napredak={napredak} />}
        {tab === "kartice" && <Kartice kurs={kurs} napredak={napredak} />}
        {tab === "profil" && <Profil kurs={kurs} me={me} napredak={napredak} />}
      </main>
      <nav className="tabs" aria-label="Glavni meni">
        {TABS.map(([id, naziv, ik]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "on" : ""}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => idi(id)}
          >
            <Ikona ime={ik} />
            <span>{naziv}</span>
          </button>
        ))}
      </nav>
      {list && <NivoList nivo={list} napredak={napredak} zatvori={() => setList(null)} />}
    </div>
  );
}

/* ---------- PUT: vijugava staza zrna (artifact app.js putScreen) ---------- */

const XS = [0, -1, 0, 1, 0, -1, 0, 1];

function Put({ kurs, me, napredak, otvori }: { kurs: Kurs; me: Me; napredak: Napredak; otvori: (n: Nivo) => void }) {
  const staza = useRef<HTMLDivElement>(null);
  const linija = useRef<SVGSVGElement>(null);
  const nivoi = kurs.nivoi;
  const zavrsen = (id: string) => !!napredak.nivoi[id]?.zavrsen;
  const otkljucan = (i: number) => i === 0 || zavrsen(nivoi[i - 1].id);
  const tekuci = nivoi.findIndex((n, i) => !zavrsen(n.id) && otkljucan(i));
  const gotovo = nivoi.filter((n) => zavrsen(n.id)).length;
  const sviGotovi = gotovo === nivoi.length;

  const rang = rangZa(kurs, napredak.zrna);
  const rp = rang.sledeci ? (napredak.zrna - rang.min) / (rang.sledeci.min - rang.min) : 1;
  const cilj = kurs.podesavanja.dnevni_cilj;
  const gp = Math.min(1, napredak.danas_zrna / cilj);
  const C = 2 * Math.PI * 21;

  const nacrtaj = useCallback(() => {
    const trail = staza.current,
      svg = linija.current;
    if (!trail || !svg) return;
    const tr = trail.getBoundingClientRect();
    const cvorovi = [...trail.querySelectorAll<HTMLElement>(".node")];
    const tacke = cvorovi.map((n) => {
      const r = n.getBoundingClientRect();
      return [r.left + r.width / 2 - tr.left, r.top + r.height / 2 - tr.top];
    });
    const putanja = (niz: number[][]) =>
      niz
        .map((p, i) => {
          if (!i) return `M${p[0]} ${p[1]}`;
          const q = niz[i - 1],
            my = (q[1] + p[1]) / 2;
          return ` C${q[0]} ${my} ${p[0]} ${my} ${p[0]} ${p[1]}`;
        })
        .join("");
    const dn = cvorovi.filter((n) => n.classList.contains("is-done")).length;
    svg.setAttribute("viewBox", `0 0 ${tr.width} ${tr.height}`);
    svg.innerHTML =
      `<path class="tl-all" d="${putanja(tacke)}"/>` +
      (dn > 0 ? `<path class="tl-done" d="${putanja(tacke.slice(0, Math.min(tacke.length, dn + 1)))}"/>` : "");
  }, []);

  useLayoutEffect(() => {
    nacrtaj();
    window.addEventListener("resize", nacrtaj);
    return () => window.removeEventListener("resize", nacrtaj);
  }, [nacrtaj, napredak]);

  const tekuciNivo = tekuci >= 0 ? nivoi[tekuci] : null;
  let gi = 0;

  return (
    <section className="put">
      <div className="hello card">
        <div className="hello-row">
          <div className="hello-txt">
            <p className="eyebrow">Zdravo, {me.korisnik.ime}</p>
            <h1 className="h1">Minimum za kurs</h1>
            <div className="mdots" aria-label={`${gotovo} od ${nivoi.length} nivoa`}>
              {nivoi.map((n) => (
                <i key={n.id} className={zavrsen(n.id) ? "on" : ""} />
              ))}
              <i className={`trophy ${napredak.test.polozen ? "on" : ""}`}>
                <Ikona ime="trophy" />
              </i>
            </div>
            <p className="sub">
              {gotovo} od {nivoi.length} nivoa ·{" "}
              {napredak.test.polozen ? "test položen" : sviGotovi ? "test te čeka" : "test na kraju"}
            </p>
          </div>
          <div className="ring" title="Dnevni cilj">
            <svg viewBox="0 0 50 50" aria-hidden="true">
              <circle cx="25" cy="25" r="21" className="ring-bg" />
              <circle
                cx="25"
                cy="25"
                r="21"
                className="ring-fg"
                style={{ strokeDasharray: C.toFixed(1), strokeDashoffset: (C * (1 - gp)).toFixed(1) }}
              />
            </svg>
            {gp >= 1 ? (
              <span className="ring-done">
                <Ikona ime="check" />
                <small>cilj</small>
              </span>
            ) : (
              <span>
                <b>{napredak.danas_zrna}</b>/{cilj}
              </span>
            )}
          </div>
        </div>
        <div className="roast-row">
          <span className="mono-s">{rang.naziv}</span>
          <div className="roast" aria-hidden="true">
            <i style={{ width: `${(rp * 100).toFixed(1)}%` }} />
          </div>
          <span className="mono-s">{rang.sledeci ? rang.sledeci.naziv : "max"}</span>
        </div>
        <p className="hello-foot">
          {rang.sledeci
            ? `Još ${zrnaTxt(rang.sledeci.min - napredak.zrna)} do ranga „${rang.sledeci.naziv}“`
            : "Najviši rang!"}{" "}
          · {danaTxt(napredak.niz_dana)} zaredom
        </p>
      </div>

      {tekuciNivo && (
        <button type="button" className="btn btn-gold btn-big" onClick={() => otvori(tekuciNivo)}>
          {gotovo ? "Nastavi" : "Počni"} · Nivo {tekuciNivo.n}
        </button>
      )}

      <div className="trail" ref={staza}>
        <svg className="trail-line" aria-hidden="true" ref={linija} />
        {kurs.delovi.map((deo) => (
          <div key={deo.naziv} style={{ display: "contents" }}>
            <div className="part-banner">
              <span>{deo.naziv}</span>
            </div>
            {deo.nivoi.map((id) => {
              const i = nivoi.findIndex((n) => n.id === id);
              const n = nivoi[i];
              const done = zavrsen(n.id),
                unl = otkljucan(i),
                cur = i === tekuci;
              const stanje = done ? "done" : cur ? "current" : unl ? "open" : "locked";
              return (
                <div key={n.id} className={`node-wrap${cur ? " cur" : ""}`} style={{ "--x": XS[gi++ % 8] } as React.CSSProperties}>
                  {cur && (
                    <span className="kreni" aria-hidden="true">
                      Kreni
                    </span>
                  )}
                  <button
                    type="button"
                    className={`node is-${stanje}`}
                    aria-label={`Nivo ${n.n}: ${n.title}${done ? ", završen" : unl ? "" : ", zaključan"}`}
                    onClick={() => unl && otvori(n)}
                  >
                    <Svg html={BEAN} />
                    <span className="node-n">{stanje === "locked" ? <Ikona ime="lock" /> : n.n}</span>
                  </button>
                  <div className="node-meta">
                    <b>{n.title}</b>
                    {done ? (
                      <Svg html={zvezdice(napredak.nivoi[n.id].zvezdice)} />
                    ) : (
                      <span className="node-sub">{unl ? `~${n.min} min` : "Zaključano"}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div className="part-banner">
          <span>Finale</span>
        </div>
        <div className="node-wrap final">
          <button
            type="button"
            className={`node node-final ${napredak.test.polozen ? "is-done" : sviGotovi ? "is-current" : "is-locked"}`}
            aria-label="Završni test"
          >
            <Ikona ime={sviGotovi ? "trophy" : "lock"} />
          </button>
          <div className="node-meta">
            <b>Završni test</b>
            <span className="node-sub">
              {kurs.podesavanja.test_pitanja} pitanja · prolaz {Math.round(kurs.podesavanja.prag * 100)}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function NivoList({ nivo, napredak, zatvori }: { nivo: Nivo; napredak: Napredak; zatvori: () => void }) {
  const zapamti = nivo.steps.filter((s) => s.remember).slice(0, 4);
  const izazova = nivo.steps.filter((s) => IZAZOVI.includes(s.t)).length;
  const stanje = napredak.nivoi[nivo.id];

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && zatvori();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [zatvori]);

  return (
    <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && zatvori()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={nivo.title}>
        <div className="msheet" style={{ "--mc": nivo.color } as React.CSSProperties}>
          <div className="msheet-band">
            <Ikona ime={nivo.icon} />
            <span>Nivo {nivo.n}</span>
            {stanje?.zavrsen && <Svg html={zvezdice(stanje.zvezdice)} />}
          </div>
          <h2 className="h2">{nivo.title}</h2>
          <p className="msheet-d">{nivo.desc}</p>
          <ul className="meta">
            <li>
              <Ikona ime="clock" />~{nivo.min} min
            </li>
            <li>{nivo.steps.length} kartica</li>
            <li>{izazova} izazova</li>
          </ul>
          <p className="eyebrow">Šta ćeš znati</p>
          <ul className="learn">
            {zapamti.map((s) => (
              <li key={s.id}>
                <Ikona ime="check" />
                <span dangerouslySetInnerHTML={{ __html: md(String(s.remember)) }} />
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-gold btn-big" disabled>
            Lekcije stižu uskoro
          </button>
          <button type="button" className="btn btn-ghost" onClick={zatvori}>
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- IGRE ---------- */

function Igre({ kurs, napredak }: { kurs: Kurs; napredak: Napredak }) {
  return (
    <section className="igre">
      <p className="eyebrow">Igraonica</p>
      <h1 className="h1">Vežbaj kroz igru</h1>
      <p className="lead">Svaka igra se otključava kad završiš nivo u kom je to gradivo. Igre donose zrna i bedževe.</p>
      <div className="glist">
        {kurs.igre.map((g) => {
          const nivo = kurs.nivoi.find((n) => n.id === g.after)!;
          const otvorena = !!napredak.nivoi[g.after]?.zavrsen;
          return (
            <button key={g.id} type="button" className={`gcard${otvorena ? "" : " locked"}`} aria-disabled={!otvorena}>
              <span className="gcard-art" style={{ "--gc": g.color } as React.CSSProperties}>
                <Ikona ime={g.ic} />
              </span>
              <span className="gcard-txt">
                <b>{g.t}</b>
                <span>{g.d}</span>
                <small>
                  {otvorena ? (
                    "Nova igra"
                  ) : (
                    <>
                      <Ikona ime="lock" />
                      Posle nivoa {nivo.n} · {nivo.title}
                    </>
                  )}
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- KARTICE: minimum lista (rečnik sa okretanjem kartica stiže u Modulu 1) ---------- */

function Kartice({ kurs, napredak }: { kurs: Kurs; napredak: Napredak }) {
  return (
    <section className="kartice">
      <p className="eyebrow">Učionica</p>
      <h1 className="h1">Šta moraš da znaš</h1>
      <p className="lead">
        Ovo je minimum pre prvog dana kursa. Svaka stavka je „Zapamti“ kartica iz nivoa. Kad završiš nivo, stavke se štikliraju.
      </p>
      <div className="minl">
        {kurs.nivoi.map((n) => {
          const gotov = !!napredak.nivoi[n.id]?.zavrsen;
          return (
            <section key={n.id} style={{ "--mc": n.color } as React.CSSProperties}>
              <h3 className="minl-h">
                <Ikona ime={n.icon} />
                <span>
                  Nivo {n.n} · {n.title}
                </span>
              </h3>
              <ul>
                {n.steps
                  .filter((s) => s.remember)
                  .map((s) => (
                    <li key={s.id} className={gotov ? "on" : ""}>
                      <Ikona ime={gotov ? "check" : "target"} />
                      <span dangerouslySetInnerHTML={{ __html: md(String(s.remember)) }} />
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- PROFIL ---------- */

function Profil({ kurs, me, napredak }: { kurs: Kurs; me: Me; napredak: Napredak }) {
  const rang = rangZa(kurs, napredak.zrna);
  const gotovo = kurs.nivoi.filter((n) => napredak.nivoi[n.id]?.zavrsen).length;
  return (
    <section className="profil">
      <div className="phead">
        <span className="pav">
          <Svg html={avatar("zrno")} />
        </span>
        <div>
          <p className="eyebrow">{rang.naziv}</p>
          <h1 className="h1">
            {me.korisnik.ime} {me.korisnik.prezime}
          </h1>
        </div>
      </div>
      <div className="pstats">
        <div>
          <b>{napredak.zrna}</b>
          <span>zrna</span>
        </div>
        <div>
          <b>{napredak.najduzi_niz}</b>
          <span>najduži niz</span>
        </div>
        <div>
          <b>
            {gotovo}/{kurs.nivoi.length}
          </b>
          <span>nivoa</span>
        </div>
        <div>
          <b>{napredak.test.najbolje ? `${napredak.test.najbolje}%` : "–"}</b>
          <span>test</span>
        </div>
      </div>
      <h2 className="h2 sec-h">
        Bedževi{" "}
        <small>
          {napredak.bedzevi.length}/{kurs.bedzevi.length}
        </small>
      </h2>
      <div className="badges">
        {kurs.bedzevi.map((b) => {
          const ima = napredak.bedzevi.includes(b.id);
          return (
            <div key={b.id} className={`badge${ima ? " on" : ""}`}>
              <Svg html={medal(b.id, ima)} />
              <b>{b.naziv}</b>
              <span>{b.opis}</span>
            </div>
          );
        })}
      </div>
      <h2 className="h2 sec-h">Nalog</h2>
      <div className="settings card">
        <div className="set-row">
          <span>
            <Ikona ime="user" />
            Korisničko ime
          </span>
          <b>{me.korisnik.korisnicko_ime}</b>
        </div>
        {me.lokal && (
          <div className="set-row">
            <span>
              <Ikona ime="cup" />
              Lokal
            </span>
            <b>{me.lokal.naziv}</b>
          </div>
        )}
      </div>
      <p className="note">
        <Ikona ime="info" />
        Napredak se čuva na tvom nalogu, pa možeš da nastaviš i sa drugog telefona.
      </p>
      <Odjava />
    </section>
  );
}
