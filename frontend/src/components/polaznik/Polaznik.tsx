"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { avatar, avatars, BEAN, icon, medal } from "@/lib/art";
import { api, BezMreze, posalji } from "@/lib/api";
import { RECEPTI } from "@/lib/igre";
import { esc, sfx } from "@/lib/jezgro";
import { type Dobitak, type Napredak, oznaciKarticu } from "@/lib/napredak";
import { type IgraOpis, IZAZOVI, type Kurs, type Nivo, type SadrzajOut, md, mnozina, rangZa } from "@/lib/sadrzaj";
import type { TestStanje } from "@/lib/test";
import { DOGADJAJ_POSLATO, DOGADJAJ_PROMENA, type Poslato, type Stavka, citajRed, dodajURed, noviKljuc, posaljiRed, postaviKorisnika } from "@/lib/red";
import { instaliraj, pratiInstalaciju, registrujSW, sacuvajZaOffline, stanjeInstalacije } from "@/lib/pwa";
import { type Podsetnik, odlozeni, odlozi, podsetnici } from "@/lib/podsetnici";
import { type Rang, opsegNedelje, ucitajRang } from "@/lib/rang";
import { toast } from "@/lib/toast";
import type { Me } from "@/lib/types";
import { Odjava } from "../Odjava";
import { Ikona, Svg } from "../Svg";
import { Igra } from "./Igra";
import { Lekcija } from "./Lekcija";
import { SertifikatKartica } from "./SertifikatKartica";
import { Test } from "./Test";
import { Uvod } from "./Uvod";
import { zvezdice } from "./zvezdice";

const KURS = "osnovni";
const ZVUK = "zpz-zvuk";

type Tab = "put" | "igre" | "kartice" | "profil";
const TABS: [Tab, string, string][] = [
  ["put", "Put", "path"],
  ["igre", "Igre", "arcade"],
  ["kartice", "Kartice", "cards"],
  ["profil", "Profil", "user"],
];

const zrnaTxt = (n: number) => `${n} ${mnozina(n, "zrno", "zrna", "zrna")}`;
const danaTxt = (n: number) => `${n} ${mnozina(n, "dan", "dana", "dana")}`;

function citajZvuk() {
  try {
    return localStorage.getItem(ZVUK) !== "0";
  } catch {
    return true;
  }
}

/** Napredak sa servera dopunjen onim što čeka u redu za slanje (nivo pređen bez mreže otključava sledeći). */
function saRedom(n: Napredak, red: Stavka[]): Napredak {
  if (!red.length) return n;
  const nivoi = { ...n.nivoi };
  const kartice = { ...n.kartice };
  for (const s of red) {
    if (s.tip === "nivo") {
      const bio = nivoi[s.nivo];
      nivoi[s.nivo] = { zavrsen: true, zvezdice: Math.max(bio?.zvezdice ?? 0, s.zvezdice), najbolje: bio?.najbolje ?? 0 };
    } else if (s.tip === "kartica") kartice[s.pojam] = s.zna;
  }
  return { ...n, nivoi, kartice };
}

export function Polaznik({ me }: { me: Me }) {
  postaviKorisnika(me.korisnik.id);
  const [kurs, setKurs] = useState<Kurs | null>(null);
  const [napredakServer, setNapredak] = useState<Napredak | null>(null);
  const [greska, setGreska] = useState("");
  const [tab, setTab] = useState<Tab>("put");
  const [list, setList] = useState<Nivo | null>(null);
  const [lekcija, setLekcija] = useState<{ nivo: Nivo; kljuc: number } | null>(null);
  const [igra, setIgra] = useState<IgraOpis | null>(null);
  const [testStanje, setTestStanje] = useState<TestStanje | null>(null);
  const [uvodTesta, setUvodTesta] = useState(false);
  const [test, setTest] = useState(0);
  const [av, setAv] = useState(me.korisnik.avatar);
  const [zvuk, setZvuk] = useState(true);
  const [red, setRed] = useState<Stavka[]>([]);
  const [uMrezi, setUMrezi] = useState(true);
  const zrnaRef = useRef(0);

  const ucitajNapredak = useCallback(
    () =>
      Promise.all([api<Napredak>(`/api/napredak/${KURS}`), api<TestStanje>(`/api/test/${KURS}`)])
        .then(([n, t]) => {
          zrnaRef.current = n.zrna;
          setNapredak(n);
          setTestStanje(t);
        })
        .catch((e: Error) => setGreska(e.message)),
    [],
  );

  useEffect(() => {
    api<SadrzajOut>(`/api/sadrzaj/${KURS}`)
      .then((r) => {
        RECEPTI.recepti = r.dokument.recepti;
        RECEPTI.polja = r.dokument.recept_polja;
        setKurs(r.dokument);
        const slike = r.dokument.nivoi.flatMap((n) =>
          n.steps.flatMap((k) => [k.img, ...((k.gallery as { img: string }[] | undefined) ?? []).map((g) => g.img)]),
        );
        sacuvajZaOffline(slike.filter((x): x is string => typeof x === "string").map((x) => (x.startsWith("/") ? x : `/${x}`)));
      })
      .catch((e: Error) => setGreska(e.message));
    ucitajNapredak();
    registrujSW();
    const z = citajZvuk();
    setZvuk(z);
    sfx.on = z;
    const otkljucaj = () => sfx.unlock();
    document.addEventListener("pointerdown", otkljucaj, { once: true });
    return () => document.removeEventListener("pointerdown", otkljucaj);
  }, [ucitajNapredak]);

  /** Server je javio novi zbir zrna i bedževe: obaveštenja i gornja traka (artifact gain/award). */
  const dobitak = useCallback(
    (d: Dobitak) => {
      if (!kurs) return;
      const pre = rangZa(kurs, zrnaRef.current).i;
      zrnaRef.current = d.ukupno_zrna;
      const posle = rangZa(kurs, d.ukupno_zrna);
      if (posle.i > pre) toast(`${icon("star")}<span>Novi rang: <b>${esc(posle.naziv)}</b></span>`, "gold");
      for (const id of d.novi_bedzevi) {
        const b = kurs.bedzevi.find((x) => x.id === id);
        if (b) {
          toast(`${medal(id, true)}<span>Novi bedž: <b>${esc(b.naziv)}</b></span>`, "badge");
          sfx.win();
        }
      }
      setNapredak((n) =>
        n && { ...n, zrna: d.ukupno_zrna, bedzevi: [...n.bedzevi, ...d.novi_bedzevi.filter((x) => !n.bedzevi.includes(x))] },
      );
    },
    [kurs],
  );

  // red za slanje: šalje se pri otvaranju, kad se veza vrati i povremeno dok nešto čeka
  useEffect(() => {
    const osvezi = () => setRed(citajRed());
    const mreza = () => {
      setUMrezi(navigator.onLine);
      if (navigator.onLine) posaljiRed();
    };
    const poslato = (e: Event) => {
      const p = (e as CustomEvent<Poslato>).detail;
      if (p.dobitak) dobitak(p.dobitak);
      if (p.poslato) toast(`${icon("check")}<span>Poslato sa telefona: <b>${p.poslato}</b></span>`, "gold");
      if (p.odbijeno) toast(`${icon("info")}<span>Server nije prihvatio ${p.odbijeno} sačuvanih rezultata (sadržaj je u međuvremenu izmenjen).</span>`);
      ucitajNapredak();
    };
    osvezi();
    setUMrezi(navigator.onLine);
    window.addEventListener(DOGADJAJ_PROMENA, osvezi);
    window.addEventListener(DOGADJAJ_POSLATO, poslato);
    window.addEventListener("online", mreza);
    window.addEventListener("offline", mreza);
    const t = window.setInterval(() => citajRed().length && navigator.onLine && posaljiRed(), 30_000);
    posaljiRed();
    return () => {
      window.removeEventListener(DOGADJAJ_PROMENA, osvezi);
      window.removeEventListener(DOGADJAJ_POSLATO, poslato);
      window.removeEventListener("online", mreza);
      window.removeEventListener("offline", mreza);
      window.clearInterval(t);
    };
  }, [dobitak, ucitajNapredak]);

  const idi = (t: Tab) => {
    sfx.tap();
    setTab(t);
    window.scrollTo(0, 0);
  };

  const pokreni = (nivo: Nivo) => {
    setList(null);
    sfx.tap();
    setLekcija({ nivo, kljuc: Date.now() });
  };

  function prebaciZvuk() {
    const z = !zvuk;
    setZvuk(z);
    sfx.on = z;
    try {
      localStorage.setItem(ZVUK, z ? "1" : "0");
    } catch {
      /* bez skladišta: važi do zatvaranja */
    }
    if (z) sfx.ok();
  }

  async function sacuvajAvatar(a: string) {
    const r = await posalji<Me>("/api/me", "PATCH", { avatar: a });
    setAv(r.korisnik.avatar);
  }

  if (greska) {
    return (
      <div id="app">
        <p className="note bad">{greska}</p>
      </div>
    );
  }
  if (!kurs || !napredakServer) return <div id="app" aria-busy="true" />;

  const napredak = saRedom(napredakServer, red);
  const rang = rangZa(kurs, napredak.zrna);
  return (
    <div id="app">
      <header className="top">
        <button type="button" className="top-me" onClick={() => idi("profil")} aria-label="Profil">
          <Svg html={avatar(av ?? "zrno")} />
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
          <button type="button" className="icon-btn" onClick={prebaciZvuk} aria-label={zvuk ? "Isključi zvuk" : "Uključi zvuk"}>
            <Ikona ime={zvuk ? "sound" : "mute"} />
          </button>
        </div>
      </header>
      {(!uMrezi || red.length > 0) && (
        <p className="mreza" role="status">
          <Ikona ime={uMrezi ? "clock" : "info"} />
          {uMrezi ? "Šaljem sačuvano sa telefona" : "Bez mreže. Lekcije, igre i kartice rade; test čeka vezu."}
          {red.length > 0 && <b>{red.length} čeka</b>}
        </p>
      )}
      <main id="view" className={`view view-${tab}`}>
        {tab === "put" && (
          <Put
            kurs={kurs}
            me={me}
            napredak={napredak}
            otvori={setList}
            pokreni={pokreni}
            test={() => setUvodTesta(true)}
            idi={idi}
          />
        )}
        {tab === "igre" && <Igre kurs={kurs} napredak={napredak} otvori={setIgra} />}
        {tab === "kartice" && <Kartice kurs={kurs} napredak={napredak} setNapredak={setNapredak} dobitak={dobitak} />}
        {tab === "profil" && (
          <Profil
            kurs={kurs}
            me={me}
            napredak={napredak}
            testStanje={testStanje}
            av={av}
            zvuk={zvuk}
            prebaciZvuk={prebaciZvuk}
            sacuvajAvatar={sacuvajAvatar}
            test={() => setUvodTesta(true)}
          />
        )}
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
      {list && <NivoList nivo={list} napredak={napredak} zatvori={() => setList(null)} pokreni={pokreni} />}
      {lekcija && (
        <Lekcija
          key={lekcija.kljuc}
          kurs={kurs}
          nivo={lekcija.nivo}
          dobitak={dobitak}
          zatvori={() => {
            setLekcija(null);
            ucitajNapredak();
          }}
          sledeci={(n) => {
            ucitajNapredak();
            if (n) pokreni(n);
            else setLekcija(null);
          }}
        />
      )}
      {igra && (
        <Igra
          kurs={kurs}
          igra={igra}
          napredak={napredak}
          dobitak={dobitak}
          zatvori={() => {
            setIgra(null);
            ucitajNapredak();
          }}
        />
      )}
      {uvodTesta && testStanje && (
        <UvodTesta
          stanje={testStanje}
          zatvori={() => setUvodTesta(false)}
          kreni={() => {
            setUvodTesta(false);
            sfx.tap();
            setTest(Date.now());
          }}
        />
      )}
      {test > 0 && (
        <Test
          key={test}
          kurs={kurs}
          ime={`${me.korisnik.ime} ${me.korisnik.prezime}`}
          av={av}
          dobitak={dobitak}
          zatvori={() => {
            setTest(0);
            ucitajNapredak();
          }}
          ponoviNivo={(id) => {
            setTest(0);
            ucitajNapredak();
            const n = kurs.nivoi.find((x) => x.id === id);
            if (n) pokreni(n);
          }}
        />
      )}
      {!av && (
        <Uvod
          ime={me.korisnik.ime}
          sacuvaj={async (a) => {
            await sacuvajAvatar(a);
            pokreni(kurs.nivoi[0]);
          }}
        />
      )}
    </div>
  );
}

/* ---------- PUT: vijugava staza zrna (artifact app.js putScreen) ---------- */

const XS = [0, -1, 0, 1, 0, -1, 0, 1];

function Put({
  kurs,
  me,
  napredak,
  otvori,
  pokreni,
  test,
  idi,
}: {
  kurs: Kurs;
  me: Me;
  napredak: Napredak;
  otvori: (n: Nivo) => void;
  pokreni: (n: Nivo) => void;
  test: () => void;
  idi: (t: Tab) => void;
}) {
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
    document.fonts?.ready.then(nacrtaj);
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

      <KarticaPodsetnika
        kurs={kurs}
        me={me}
        napredak={napredak}
        uradi={(a) => (a.tip === "nivo" ? pokreni(a.nivo) : idi(a.tip))}
      />
      <RangKartica kurs={kurs} zrna={napredak.zrna} />

      {tekuciNivo ? (
        <button type="button" className="btn btn-gold btn-big" onClick={() => pokreni(tekuciNivo)}>
          {gotovo ? "Nastavi" : "Počni"} · Nivo {tekuciNivo.n}
        </button>
      ) : (
        <button type="button" className={`btn btn-big${napredak.test.polozen ? "" : " btn-gold"}`} onClick={test}>
          {napredak.test.polozen ? "Pogledaj sertifikat" : "Završni test"}
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
                    onClick={() => {
                      if (unl) {
                        sfx.tap();
                        otvori(n);
                      } else {
                        sfx.bad();
                        toast(`Prvo završi nivo ${n.n - 1}.`);
                      }
                    }}
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
            onClick={() => {
              if (sviGotovi) test();
              else {
                sfx.bad();
                toast(`Završni test se otključava posle svih ${nivoi.length} nivoa.`);
              }
            }}
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

function NivoList({
  nivo,
  napredak,
  zatvori,
  pokreni,
}: {
  nivo: Nivo;
  napredak: Napredak;
  zatvori: () => void;
  pokreni: (n: Nivo) => void;
}) {
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
          <button type="button" className="btn btn-gold btn-big" onClick={() => pokreni(nivo)} autoFocus>
            {stanje?.zavrsen ? "Ponovi nivo" : "Započni"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- IGRE ---------- */

function Igre({ kurs, napredak, otvori }: { kurs: Kurs; napredak: Napredak; otvori: (g: IgraOpis) => void }) {
  return (
    <section className="igre">
      <p className="eyebrow">Igraonica</p>
      <h1 className="h1">Vežbaj kroz igru</h1>
      <p className="lead">Svaka igra se otključava kad završiš nivo u kom je to gradivo. Igre donose zrna i bedževe.</p>
      <div className="glist">
        {kurs.igre.map((g) => {
          const nivo = kurs.nivoi.find((n) => n.id === g.after)!;
          const otvorena = !!napredak.nivoi[g.after]?.zavrsen;
          const rekord = napredak.igre[g.id];
          const stanje = !rekord ? "Nova igra" : g.id === "swipe" ? `Rekord: ${rekord.najbolje} poena` : `Najbolje: ${rekord.najbolje}%`;
          return (
            <button
              key={g.id}
              type="button"
              className={`gcard${otvorena ? "" : " locked"}`}
              aria-disabled={!otvorena}
              onClick={() => {
                if (otvorena) {
                  sfx.tap();
                  otvori(g);
                } else {
                  sfx.bad();
                  toast(`Igra se otključava posle nivoa ${nivo.n}.`);
                }
              }}
            >
              <span className="gcard-art" style={{ "--gc": g.color } as React.CSSProperties}>
                <Ikona ime={g.ic} />
              </span>
              <span className="gcard-txt">
                <b>{g.t}</b>
                <span>{g.d}</span>
                <small>
                  {otvorena ? (
                    stanje
                  ) : (
                    <>
                      <Ikona ime="lock" />
                      Posle nivoa {nivo.n} · {nivo.title}
                    </>
                  )}
                </small>
              </span>
              {rekord && rekord.zvezdice > 0 && <Svg html={zvezdice(rekord.zvezdice)} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- KARTICE: rečnik za okretanje i minimum lista (artifact app.js karticeScreen) ---------- */

function Kartice({
  kurs,
  napredak,
  setNapredak,
  dobitak,
}: {
  kurs: Kurs;
  napredak: Napredak;
  setNapredak: React.Dispatch<React.SetStateAction<Napredak | null>>;
  dobitak: (d: Dobitak) => void;
}) {
  const [nacin, setNacin] = useState<"kartice" | "minimum">("kartice");
  const [filter, setFilter] = useState("all");
  const [idx, setIdx] = useState(0);
  const [okrenuta, setOkrenuta] = useState(false);
  const lista = kurs.pojmovi.filter((p) => filter === "all" || p.nivo === filter);
  const p = lista[idx % Math.max(1, lista.length)];
  const zna = lista.filter((x) => napredak.kartice[x.id]).length;

  const pomeri = useCallback(
    (korak: number) => {
      setOkrenuta(false);
      setIdx((i) => (i + korak + lista.length) % Math.max(1, lista.length));
    },
    [lista.length],
  );

  async function oceni(znam: boolean) {
    if (!p) return;
    znam ? sfx.ok() : sfx.tap();
    setNapredak((n) => n && { ...n, kartice: { ...n.kartice, [p.id]: znam } });
    pomeri(1);
    try {
      dobitak(await oznaciKarticu(kurs.kurs.kljuc, p.id, znam));
    } catch (e) {
      if (e instanceof BezMreze) dodajURed({ tip: "kartica", kljuc: noviKljuc(), kurs: kurs.kurs.kljuc, pojam: p.id, zna: znam });
      else toast(esc((e as Error).message));
    }
  }

  useEffect(() => {
    if (nacin !== "kartice") return;
    const strelice = (e: KeyboardEvent) => {
      if (document.querySelector(".sheet-wrap, #ov")) return;
      if (e.key === "ArrowRight") pomeri(1);
      else if (e.key === "ArrowLeft") pomeri(-1);
    };
    window.addEventListener("keydown", strelice);
    return () => window.removeEventListener("keydown", strelice);
  }, [nacin, pomeri]);

  const seg = (
    <div className="seg" role="group" aria-label="Prikaz">
      <button type="button" aria-pressed={nacin === "kartice"} onClick={() => setNacin("kartice")}>
        Kartice
      </button>
      <button type="button" aria-pressed={nacin === "minimum"} onClick={() => setNacin("minimum")}>
        Minimum lista
      </button>
    </div>
  );

  if (nacin === "minimum") {
    return (
      <section className="kartice">
        <p className="eyebrow">Učionica</p>
        <h1 className="h1">Šta moraš da znaš</h1>
        {seg}
        <p className="lead">
          Ovo je minimum pre prvog dana kursa. Svaka stavka je „Zapamti“ kartica iz nivoa. Kad završiš nivo, stavke se
          štikliraju.
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

  const nivoPojma = p ? kurs.nivoi.find((n) => n.id === p.nivo) : undefined;
  return (
    <section className="kartice">
      <p className="eyebrow">Učionica</p>
      <h1 className="h1">Rečnik bariste</h1>
      {seg}
      <div className="chips" role="group" aria-label="Filter po nivou">
        <button
          type="button"
          className={`chip${filter === "all" ? " on" : ""}`}
          onClick={() => {
            setFilter("all");
            setIdx(0);
            setOkrenuta(false);
          }}
        >
          Svi
        </button>
        {kurs.nivoi.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`chip${filter === n.id ? " on" : ""}`}
            onClick={() => {
              setFilter(n.id);
              setIdx(0);
              setOkrenuta(false);
            }}
          >
            N{n.n}
          </button>
        ))}
      </div>
      <div className="flash-meta">
        <span>
          {lista.length ? (idx % lista.length) + 1 : 0} / {lista.length}
        </span>
        <span>
          Znaš: <b>{zna}</b>
        </span>
      </div>
      {p && nivoPojma && (
        <div className="flash-host">
          <button
            type="button"
            className={`flash${okrenuta ? " flip" : ""}`}
            aria-label={`Okreni karticu: ${p.pojam}`}
            onClick={() => {
              setOkrenuta(!okrenuta);
              sfx.tap();
            }}
          >
            <span className="flash-in">
              <span className="flash-face">
                <span className="flash-tag" style={{ "--mc": nivoPojma.color } as React.CSSProperties}>
                  Nivo {nivoPojma.n}
                </span>
                <b className="flash-term">{p.pojam}</b>
                {napredak.kartice[p.id] && (
                  <span className="flash-known">
                    <Ikona ime="check" />
                    znaš
                  </span>
                )}
              </span>
              <span className="flash-face flash-back">
                <span className="flash-def">{p.opis}</span>
              </span>
            </span>
          </button>
        </div>
      )}
      <div className="flash-act">
        <button type="button" className="btn" onClick={() => oceni(false)}>
          Ponovi
        </button>
        <button type="button" className="btn btn-leaf" onClick={() => oceni(true)}>
          <Ikona ime="check" />
          Znam
        </button>
      </div>
      <p className="hint">Tapni karticu da je okreneš. Strelice levo-desno listaju.</p>
    </section>
  );
}

/* ---------- PROFIL ---------- */

function Profil({
  kurs,
  me,
  napredak,
  testStanje,
  av,
  zvuk,
  prebaciZvuk,
  sacuvajAvatar,
  test,
}: {
  kurs: Kurs;
  me: Me;
  napredak: Napredak;
  testStanje: TestStanje | null;
  av: string | null;
  zvuk: boolean;
  prebaciZvuk: () => void;
  sacuvajAvatar: (a: string) => Promise<void>;
  test: () => void;
}) {
  const [biram, setBiram] = useState(false);
  const rang = rangZa(kurs, napredak.zrna);
  const gotovo = kurs.nivoi.filter((n) => napredak.nivoi[n.id]?.zavrsen).length;
  return (
    <section className="profil">
      <div className="phead">
        <button type="button" className="pav" aria-label="Promeni avatar" onClick={() => setBiram(true)}>
          <Svg html={avatar(av ?? "zrno")} />
          <span className="pav-edit">
            <Ikona ime="edit" />
          </span>
        </button>
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
      {testStanje?.sertifikat && !testStanje.sertifikat.opozvan ? (
        <>
          <h2 className="h2 sec-h">Sertifikat</h2>
          <SertifikatKartica
            ime={`${me.korisnik.ime} ${me.korisnik.prezime}`}
            av={av}
            s={testStanje.sertifikat}
            nivoa={kurs.nivoi.length}
          />
        </>
      ) : (
        <div className="card cta-exam">
          <span className="cta-ic">
            <Ikona ime="trophy" />
          </span>
          <div>
            <b>Sertifikat čeka</b>
            <p>
              {testStanje?.sertifikat?.opozvan
                ? "Trener je poništio sertifikat. Položi završni test ponovo i dobićeš nov kod."
                : gotovo === kurs.nivoi.length
                  ? `Svi nivoi su gotovi. Položi završni test (${testStanje?.prag ?? 80}%) i dobij kod za trenera.`
                  : `Završi još ${kurs.nivoi.length - gotovo} ${mnozina(kurs.nivoi.length - gotovo, "nivo", "nivoa", "nivoa")}, pa položi završni test (${testStanje?.prag ?? 80}%).`}
            </p>
          </div>
          {gotovo === kurs.nivoi.length && (
            <button type="button" className="btn btn-gold" onClick={test}>
              Na test
            </button>
          )}
        </div>
      )}
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
      <h2 className="h2 sec-h">Podešavanja</h2>
      <div className="settings card">
        <button type="button" className="set-row" onClick={prebaciZvuk}>
          <span>
            <Ikona ime={zvuk ? "sound" : "mute"} />
            Zvuk
          </span>
          <b>{zvuk ? "Uključen" : "Isključen"}</b>
        </button>
        <Instalacija />
        <button type="button" className="set-row" onClick={() => setBiram(true)}>
          <span>
            <Ikona ime="edit" />
            Avatar
          </span>
          <b>{(avatars as Record<string, { t: string }>)[av ?? "zrno"]?.t}</b>
        </button>
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
      <Odjava
        pre={() =>
          !citajRed().length ||
          confirm("Neki rezultati još nisu poslati. Biće poslati kad se ponovo prijaviš na ovom telefonu. Odjaviti se?")
        }
      />
      {biram && (
        <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && setBiram(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Avatar">
            <div className="edit-form">
              <h2 className="h2">Avatar</h2>
              <div className="avs-grid">
                {Object.entries(avatars as Record<string, { t: string }>).map(([k, a]) => (
                  <button
                    key={k}
                    type="button"
                    className={`avpick${k === av ? " on" : ""}`}
                    aria-label={a.t}
                    aria-pressed={k === av}
                    onClick={async () => {
                      sfx.tap();
                      await sacuvajAvatar(k);
                      setBiram(false);
                    }}
                  >
                    <Svg html={avatar(k)} />
                    <span>{a.t}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- UVOD U ZAVRŠNI TEST (artifact app.js examIntro) ---------- */

function UvodTesta({ stanje, zatvori, kreni }: { stanje: TestStanje; zatvori: () => void; kreni: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && zatvori();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [zatvori]);

  return (
    <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && zatvori()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Završni test">
        <div className="msheet" style={{ "--mc": "var(--gold)" } as React.CSSProperties}>
          <div className="msheet-band">
            <Ikona ime="trophy" />
            <span>Finale</span>
          </div>
          <h2 className="h2">Završni test</h2>
          <p className="msheet-d">
            {stanje.pitanja} pitanja iz svih nivoa, nasumično. Za prolaz ti treba <b>{stanje.prag}%</b>. Posle prolaza dobijaš
            sertifikat sa kodom za trenera.
          </p>
          <ul className="meta">
            <li>
              <Ikona ime="clock" />~8 min
            </li>
            <li>Najbolje: {stanje.najbolje}%</li>
            <li>Pokušaja: {stanje.pokusaja}</li>
          </ul>
          {stanje.polozen && (
            <p className="note ok">
              <Ikona ime="check" />
              Već si položio sa {stanje.najbolje}%. Možeš da popraviš rezultat.
            </p>
          )}
          {stanje.otkljucan ? (
            <button type="button" className="btn btn-gold btn-big" onClick={kreni} autoFocus>
              Kreni na test
            </button>
          ) : (
            <p className="note">
              <Ikona ime="lock" />
              Test se otključava posle svih nivoa.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Red u podešavanjima: aplikacija na početnom ekranu (Android dugme, iPhone uputstvo). */
function Instalacija() {
  const [stanje, setStanje] = useState<ReturnType<typeof stanjeInstalacije>>("ne");
  useEffect(() => {
    setStanje(stanjeInstalacije());
    return pratiInstalaciju(() => setStanje(stanjeInstalacije()));
  }, []);
  if (stanje === "ne") return null;
  if (stanje === "moze")
    return (
      <button type="button" className="set-row" onClick={instaliraj}>
        <span>
          <Ikona ime="bean" />
          Aplikacija na telefonu
        </span>
        <b>Instaliraj</b>
      </button>
    );
  return (
    <div className="set-row">
      <span>
        <Ikona ime="bean" />
        Aplikacija na telefonu
      </span>
      <b>{stanje === "instalirana" ? "Instalirana" : "Deli → Dodaj na početni ekran"}</b>
    </div>
  );
}

/** Najvažniji podsetnik danas (Modul 6b); "Kasnije" ga sklanja do sutra i prikazuje sledeći. */
function KarticaPodsetnika({
  kurs,
  me,
  napredak,
  uradi,
}: {
  kurs: Kurs;
  me: Me;
  napredak: Napredak;
  uradi: (a: Podsetnik["akcija"]) => void;
}) {
  const [skriveni, setSkriveni] = useState<Set<string> | null>(null);
  useEffect(() => setSkriveni(odlozeni(me.korisnik.id)), [me.korisnik.id]);
  // localStorage se čita tek u pregledaču, pa se kartica ne pojavi pa nestane
  if (!skriveni) return null;
  const svi = podsetnici(kurs, napredak).filter((p) => !skriveni.has(p.id));
  const p = svi[0];
  if (!p) return null;
  return (
    <div className="card podsetnik" role="status">
      <span className="cta-ic">
        <Ikona ime={p.ikona} />
      </span>
      <div>
        <b>{p.naslov}</b>
        <p>{p.tekst}</p>
      </div>
      <div className="podsetnik-akcije">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            odlozi(me.korisnik.id, p.id);
            setSkriveni(new Set([...skriveni, p.id]));
          }}
        >
          Kasnije
        </button>
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            sfx.tap();
            uradi(p.akcija);
          }}
        >
          {p.akcija.naziv}
        </button>
      </div>
      {svi.length > 1 && <small className="podsetnik-jos">još {svi.length - 1}</small>}
    </div>
  );
}

/** Mesto u lokalu ove nedelje; dodir otvara listu kolega (Modul 6c). Bez mreže ili bez lokala se ne prikazuje. */
function RangKartica({ kurs, zrna }: { kurs: Kurs; zrna: number }) {
  const [rang, setRang] = useState<Rang | null>(null);
  const [otvoren, setOtvoren] = useState(false);
  useEffect(() => {
    ucitajRang(kurs.kurs.kljuc)
      .then(setRang)
      .catch(() => setRang(null));
  }, [kurs.kurs.kljuc, zrna]);
  if (!rang?.lokal) return null;
  const ja = rang.redovi.find((x) => x.ja);
  return (
    <>
      <button type="button" className="card rang-kartica" onClick={() => setOtvoren(true)}>
        <span className="cta-ic">
          <Ikona ime="trophy" />
        </span>
        <span>
          <b>{ja && ja.zrna > 0 ? `${ja.mesto}. mesto u lokalu` : "Rang lista lokala"}</b>
          <small>
            {rang.lokal} · ove nedelje {ja ? zrnaTxt(ja.zrna) : ""}
          </small>
        </span>
        <Ikona ime="next" />
      </button>
      {otvoren && <RangLista kurs={kurs} prva={rang} zatvori={() => setOtvoren(false)} />}
    </>
  );
}

function RangLista({ kurs, prva, zatvori }: { kurs: Kurs; prva: Rang; zatvori: () => void }) {
  const [pomak, setPomak] = useState(0);
  const [rang, setRang] = useState<Rang>(prva);
  useEffect(() => {
    if (pomak === 0) setRang(prva);
    else ucitajRang(kurs.kurs.kljuc, pomak).then(setRang).catch(() => {});
  }, [pomak, prva, kurs.kurs.kljuc]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && zatvori();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [zatvori]);
  const bez = rang.polaznika - rang.redovi.filter((x) => x.zrna > 0).length;
  return (
    <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && zatvori()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Rang lista">
        <div className="msheet">
          <p className="eyebrow">{rang.lokal}</p>
          <h2 className="h2">Rang lista</h2>
          <div className="seg" role="group" aria-label="Nedelja">
            <button type="button" className={pomak === 0 ? "on" : ""} aria-pressed={pomak === 0} onClick={() => setPomak(0)}>
              Ova nedelja
            </button>
            <button type="button" className={pomak === -1 ? "on" : ""} aria-pressed={pomak === -1} onClick={() => setPomak(-1)}>
              Prošla
            </button>
          </div>
          <p className="msheet-d">
            Zrna od ponedeljka do nedelje ({opsegNedelje(rang)}). Svakog ponedeljka svi kreću od nule.
          </p>
          <ol className="rang">
            {rang.redovi.map((x) => (
              <li key={x.korisnik_id} className={x.ja ? "ja" : ""}>
                <span className={`rang-mesto m${x.mesto}`}>{x.zrna > 0 ? x.mesto : "–"}</span>
                <Svg html={avatar(x.avatar ?? "zrno")} />
                <span className="rang-ime">
                  {x.ime}
                  {x.ja && <small> (ti)</small>}
                </span>
                <b>{x.zrna}</b>
              </li>
            ))}
          </ol>
          {bez > 0 && (
            <p className="msheet-d">
              Još {bez} {mnozina(bez, "kolega", "kolege", "kolega")} iz lokala {pomak === 0 ? "ove" : "te"} nedelje nema zrna.
            </p>
          )}
          <button type="button" className="btn btn-gold btn-big" onClick={zatvori} autoFocus>
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}
