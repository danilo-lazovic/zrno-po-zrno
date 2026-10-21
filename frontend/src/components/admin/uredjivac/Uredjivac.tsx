"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lekcija } from "@/components/polaznik/Lekcija";
import { datumVreme } from "@/lib/format";
import { RECEPTI } from "@/lib/igre";
import { type Korak, type Kurs, type Nivo, mnozina } from "@/lib/sadrzaj";
import {
  type KursUredjivanje,
  type NacrtOut,
  type NivoUredjivanje,
  NOVI_TIPOVI,
  TIPOVI,
  TIPOVI_BANKE,
  novKorak,
  noviId,
  noviIdPojma,
  odbaciNacrt,
  objaviNacrt,
  opisKoraka,
  sacuvajNacrt,
  ucitajNacrt,
} from "@/lib/uredjivac";
import { FormaKoraka } from "./forme";
import { Broj, Tekst } from "./polja";

type Deo = "koraci" | "banka" | "runda" | "nivo";
const DELOVI: { id: Deo; naziv: string }[] = [
  { id: "koraci", naziv: "Koraci" },
  { id: "banka", naziv: "Banka za test" },
  { id: "runda", naziv: "Brza runda" },
  { id: "nivo", naziv: "O nivou" },
];

/** Uređivač kursa: radi na nacrtu, polaznici vide objavljenu verziju dok se nacrt ne objavi. */
export function Uredjivac() {
  const [nacrt, setNacrt] = useState<NacrtOut | null>(null);
  const [dok, setDok] = useState<KursUredjivanje | null>(null);
  const [prljavo, setPrljavo] = useState(false);
  const [cuva, setCuva] = useState(false);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [sekcija, setSekcija] = useState<string>("");
  const [deo, setDeo] = useState<Deo>("koraci");
  const [izabran, setIzabran] = useState<string | null>(null);
  const [pregled, setPregled] = useState<Nivo | null>(null);
  const [objava, setObjava] = useState(false);
  const dokRef = useRef(dok);
  dokRef.current = dok;

  const ucitaj = useCallback(async () => {
    try {
      const n = await ucitajNacrt();
      setNacrt(n);
      setDok(n.dokument);
      setPrljavo(false);
      setGreska("");
      setSekcija((s) => s || n.dokument.nivoi[0].id);
    } catch (e) {
      setGreska((e as Error).message);
    }
  }, []);

  useEffect(() => {
    ucitaj();
  }, [ucitaj]);

  // izmene koje nisu sačuvane ne nestaju tiho
  useEffect(() => {
    if (!prljavo) return;
    const upozori = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", upozori);
    return () => window.removeEventListener("beforeunload", upozori);
  }, [prljavo]);

  // id-jevi koji su ikad korišćeni plus novi u ovom nacrtu: novi korak nikad ne dobija tuđi id
  const zauzeti = useMemo(() => {
    const s = new Set(nacrt?.zauzeti_id ?? []);
    dok?.nivoi.forEach((n) => [...n.steps, ...n.pool, ...n.swipe].forEach((k) => s.add(k.id)));
    dok?.pojmovi.forEach((p) => s.add(p.id));
    return s;
  }, [nacrt, dok]);

  if (!dok || !nacrt) return greska ? <p className="note bad">{greska}</p> : <p className="sub">Učitavam nacrt…</p>;

  const menjaj = (f: (d: KursUredjivanje) => KursUredjivanje) => {
    setDok((d) => (d ? f(d) : d));
    setPrljavo(true);
    setPoruka("");
  };
  const menjajNivo = (id: string, f: (n: NivoUredjivanje) => NivoUredjivanje) =>
    menjaj((d) => ({ ...d, nivoi: d.nivoi.map((n) => (n.id === id ? f(n) : n)) }));

  async function sacuvaj() {
    const poslat = dokRef.current!;
    setCuva(true);
    setGreska("");
    try {
      const n = await sacuvajNacrt(poslat, nacrt!.revizija);
      setNacrt(n);
      if (dokRef.current === poslat) setPrljavo(false);
      setPoruka(n.greske.length ? "Sačuvano, ali nacrt ima greške koje treba ispraviti pre objave." : "Nacrt je sačuvan.");
    } catch (e) {
      setGreska((e as Error).message);
    } finally {
      setCuva(false);
    }
  }

  async function odbaci() {
    if (!confirm("Odbaciti nacrt? Sve nesačuvane i sačuvane izmene se brišu i vraća se objavljena verzija.")) return;
    try {
      if (nacrt!.revizija > 0) await odbaciNacrt();
      await ucitaj();
      setIzabran(null);
      setPoruka("Nacrt je odbačen.");
    } catch (e) {
      setGreska((e as Error).message);
    }
  }

  function pokaziPregled(n: Nivo) {
    // recepti za igru u lekciji dolaze iz nacrta, ne iz objavljene verzije
    RECEPTI.recepti = dok!.recepti;
    RECEPTI.polja = dok!.recept_polja;
    setPregled(n);
  }

  const nivo = dok.nivoi.find((n) => n.id === sekcija);
  const sacuvan = nacrt.revizija > 0;

  return (
    <>
      <div className="adm-glava">
        <div>
          <p className="eyebrow">
            <a href="/admin/sadrzaj">Sadržaj</a> · {dok.kurs.naziv}
          </p>
          <h1 className="h1">Uređivač</h1>
        </div>
        <div className="ur-akcije">
          <button type="button" className="btn btn-ghost" onClick={odbaci} disabled={!sacuvan && !prljavo}>
            Odbaci nacrt
          </button>
          <button type="button" className="btn" onClick={sacuvaj} disabled={!prljavo || cuva}>
            {cuva ? "Čuvam…" : "Sačuvaj"}
          </button>
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => setObjava(true)}
            disabled={prljavo || !sacuvan || nacrt.greske.length > 0 || nacrt.izmene.length === 0}
            title={prljavo ? "Prvo sačuvaj izmene" : undefined}
          >
            Objavi…
          </button>
        </div>
      </div>

      <div className="ur-stanje" aria-live="polite">
        {sacuvan ? (
          <span>
            Nacrt na osnovu <b>v{nacrt.osnova}</b> · {nacrt.izmene.length} {mnozina(nacrt.izmene.length, "izmena", "izmene", "izmena")} · sačuvao {nacrt.izmenio} {datumVreme(nacrt.izmenjen_u)}
          </span>
        ) : (
          <span>
            Nema sačuvanog nacrta; izmene kreću od objavljene <b>v{nacrt.osnova}</b>. Polaznici vide objavljenu verziju dok ne objaviš novu.
          </span>
        )}
        {prljavo && <span className="znak znak-pozvan">Nesačuvane izmene</span>}
        {poruka && !prljavo && <span className="znak znak-aktivan">{poruka}</span>}
      </div>

      {greska && (
        <div className="note bad ur-poruka" role="alert">
          {greska}
          <button type="button" className="btn btn-ghost" onClick={ucitaj}>
            Učitaj najnoviji nacrt
          </button>
        </div>
      )}
      {nacrt.greske.length > 0 && (
        <details className="panel ur-greske" open>
          <summary>
            <b>
              {nacrt.greske.length} {mnozina(nacrt.greske.length, "greška", "greške", "grešaka")}
            </b>{" "}
            u sačuvanom nacrtu, objava čeka dok se ne isprave
          </summary>
          <ul>
            {nacrt.greske.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="ur-raspored">
        <nav className="ur-sekcije" aria-label="Delovi kursa">
          {dok.nivoi.map((n) => (
            <button
              key={n.id}
              type="button"
              aria-current={sekcija === n.id ? "true" : undefined}
              onClick={() => {
                setSekcija(n.id);
                setIzabran(null);
              }}
            >
              <span className="mono">{n.n}</span> {n.title}
            </button>
          ))}
          <button type="button" aria-current={sekcija === "pojmovi" ? "true" : undefined} onClick={() => setSekcija("pojmovi")}>
            Pojmovi
          </button>
          <button type="button" aria-current={sekcija === "podesavanja" ? "true" : undefined} onClick={() => setSekcija("podesavanja")}>
            Podešavanja
          </button>
        </nav>

        <section className="ur-sadrzaj">
          {nivo && (
            <>
              <div className="ur-nivo-glava">
                <h2 className="sec-adm">
                  Nivo {nivo.n} · {nivo.title}
                </h2>
                <button type="button" className="btn" onClick={() => pokaziPregled(nivo)}>
                  Pregled kao polaznik
                </button>
              </div>
              <div className="ur-tabovi" role="tablist">
                {DELOVI.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    role="tab"
                    aria-selected={deo === d.id}
                    onClick={() => {
                      setDeo(d.id);
                      setIzabran(null);
                    }}
                  >
                    {d.naziv}
                    <small>{d.id === "koraci" ? nivo.steps.length : d.id === "banka" ? nivo.pool.length : d.id === "runda" ? nivo.swipe.length : ""}</small>
                  </button>
                ))}
              </div>
              {(deo === "koraci" || deo === "banka") && (
                <SpisakKoraka
                  key={`${nivo.id}-${deo}`}
                  nivo={nivo}
                  banka={deo === "banka"}
                  izabran={izabran}
                  izaberi={setIzabran}
                  menjaj={(f) => menjajNivo(nivo.id, (n) => (deo === "banka" ? { ...n, pool: f(n.pool) } : { ...n, steps: f(n.steps) }))}
                  noviId={() => noviId(nivo.id, deo === "banka" ? "b" : "k", zauzeti)}
                  pregled={(koraci) => pokaziPregled({ ...nivo, steps: koraci })}
                />
              )}
              {deo === "runda" && (
                <BrzaRunda nivo={nivo} menjaj={(swipe) => menjajNivo(nivo.id, (n) => ({ ...n, swipe }))} noviId={() => noviId(nivo.id, "s", zauzeti)} />
              )}
              {deo === "nivo" && <ONivou nivo={nivo} menjaj={(f) => menjajNivo(nivo.id, f)} />}
            </>
          )}
          {sekcija === "pojmovi" && <Pojmovi dok={dok} menjaj={menjaj} zauzeti={zauzeti} />}
          {sekcija === "podesavanja" && <Podesavanja dok={dok} menjaj={menjaj} />}
        </section>
      </div>

      {objava && (
        <Objava
          nacrt={nacrt}
          zatvori={() => setObjava(false)}
          objavljeno={async (v) => {
            setObjava(false);
            await ucitaj();
            setIzabran(null);
            setPoruka(`Objavljena je v${v}. Polaznici je dobijaju pri sledećem otvaranju.`);
          }}
        />
      )}

      {pregled && (
        <Lekcija
          kurs={dok as unknown as Kurs}
          nivo={pregled}
          pregled
          dobitak={() => {}}
          zatvori={() => setPregled(null)}
          sledeci={() => setPregled(null)}
        />
      )}
    </>
  );
}

function SpisakKoraka({
  nivo,
  banka,
  izabran,
  izaberi,
  menjaj,
  noviId,
  pregled,
}: {
  nivo: NivoUredjivanje;
  banka: boolean;
  izabran: string | null;
  izaberi: (id: string | null) => void;
  menjaj: (f: (k: Korak[]) => Korak[]) => void;
  noviId: () => string;
  pregled: (koraci: Korak[]) => void;
}) {
  const koraci = banka ? nivo.pool : nivo.steps;
  const tipovi = banka ? TIPOVI_BANKE : NOVI_TIPOVI;
  const [tip, setTip] = useState(tipovi[0]);
  const k = koraci.find((x) => x.id === izabran);
  const idx = k ? koraci.indexOf(k) : -1;

  const pomeri = (i: number, j: number) =>
    menjaj((ks) => {
      const s = [...ks];
      [s[i], s[j]] = [s[j], s[i]];
      return s;
    });

  return (
    <div className="ur-dve">
      <div>
        <p className="sub">
          {banka
            ? "Pitanja iz banke izlaze samo na završnom testu (uz pitanja iz koraka) i nikad ne stižu na telefon pre testa."
            : "Koraci idu ovim redom. Pitanja iz koraka mogu izaći i na završnom testu."}
        </p>
        <ol className="ur-koraci">
          {koraci.map((x, i) => (
            <li key={x.id} aria-current={x.id === izabran ? "true" : undefined}>
              <button type="button" className="ur-korak" onClick={() => izaberi(x.id)}>
                <span className="mono">{i + 1}</span>
                <span>
                  <small>{TIPOVI[x.t] ?? x.t}</small>
                  {opisKoraka(x)}
                </span>
              </button>
              {!banka && (
                <span className="ur-dugmici">
                  <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={() => pomeri(i, i - 1)} aria-label="Pomeri gore">
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={i === koraci.length - 1}
                    onClick={() => pomeri(i, i + 1)}
                    aria-label="Pomeri dole"
                  >
                    ↓
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="ur-dodaj">
          <select className="inp" value={tip} onChange={(e) => setTip(e.target.value)} aria-label="Tip novog koraka">
            {tipovi.map((t) => (
              <option key={t} value={t}>
                {TIPOVI[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const nov = novKorak(tip, noviId());
              menjaj((ks) => (idx >= 0 && !banka ? [...ks.slice(0, idx + 1), nov, ...ks.slice(idx + 1)] : [...ks, nov]));
              izaberi(nov.id);
            }}
          >
            + {banka ? "Dodaj pitanje" : idx >= 0 ? "Dodaj korak posle izabranog" : "Dodaj korak"}
          </button>
        </div>
      </div>
      <div>
        {k ? (
          <>
            <div className="ur-forma-akcije">
              <button type="button" className="btn" onClick={() => pregled(banka ? [k] : koraci.slice(idx))}>
                {banka ? "Pregled pitanja" : "Pregled od ovog koraka"}
              </button>
              <button
                type="button"
                className="btn btn-ghost ur-brisi"
                onClick={() => {
                  if (!confirm(`Obrisati „${opisKoraka(k)}“? Odgovori koje su polaznici već dali ostaju u statistici.`)) return;
                  menjaj((ks) => ks.filter((x) => x.id !== k.id));
                  izaberi(null);
                }}
              >
                Obriši
              </button>
            </div>
            <FormaKoraka korak={k} promeni={(v) => menjaj((ks) => ks.map((x) => (x.id === k.id ? v : x)))} />
          </>
        ) : (
          <p className="prazno">Izaberi {banka ? "pitanje" : "korak"} sa spiska da ga urediš.</p>
        )}
      </div>
    </div>
  );
}

function BrzaRunda({
  nivo,
  menjaj,
  noviId,
}: {
  nivo: NivoUredjivanje;
  menjaj: (s: NivoUredjivanje["swipe"]) => void;
  noviId: () => string;
}) {
  const s = nivo.swipe;
  return (
    <>
      <p className="sub">Tvrdnje za igru Brza runda; polaznik ih prevlači levo (netačno) ili desno (tačno).</p>
      <table className="tabela ur-runda">
        <thead>
          <tr>
            <th>Tvrdnja</th>
            <th>Tačna?</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {s.map((x) => (
            <tr key={x.id}>
              <td>
                <input
                  className="inp"
                  value={x.q}
                  onChange={(e) => menjaj(s.map((y) => (y.id === x.id ? { ...y, q: e.target.value } : y)))}
                  aria-label={`Tvrdnja ${x.id}`}
                />
              </td>
              <td>
                <select
                  className="inp"
                  value={x.a ? "1" : "0"}
                  onChange={(e) => menjaj(s.map((y) => (y.id === x.id ? { ...y, a: e.target.value === "1" } : y)))}
                  aria-label="Tačna?"
                >
                  <option value="1">Tačno</option>
                  <option value="0">Netačno</option>
                </select>
              </td>
              <td>
                <button type="button" className="btn btn-ghost" onClick={() => menjaj(s.filter((y) => y.id !== x.id))} aria-label="Obriši tvrdnju">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn ur-dodaj-red" onClick={() => menjaj([...s, { id: noviId(), q: "", a: true }])}>
        + Dodaj tvrdnju
      </button>
    </>
  );
}

function ONivou({ nivo, menjaj }: { nivo: NivoUredjivanje; menjaj: (f: (n: NivoUredjivanje) => NivoUredjivanje) => void }) {
  return (
    <div className="ur-forma">
      <p className="sub">Nivoi se ne dodaju, ne brišu i ne premeštaju: na njih su vezani napredak polaznika i test.</p>
      <Tekst naziv="Naziv" vrednost={nivo.title} promeni={(v) => menjaj((n) => ({ ...n, title: v }))} />
      <Tekst naziv="Opis" vrednost={nivo.desc} promeni={(v) => menjaj((n) => ({ ...n, desc: v }))} vise />
      <div className="ur-niz">
        <Broj naziv="Trajanje (min)" vrednost={nivo.min} promeni={(v) => menjaj((n) => ({ ...n, min: v }))} korak={1} />
        <label className="ur-polje ur-kratko">
          <span>Boja</span>
          <input className="inp" type="color" value={nivo.color} onChange={(e) => menjaj((n) => ({ ...n, color: e.target.value }))} />
        </label>
      </div>
    </div>
  );
}

function Pojmovi({
  dok,
  menjaj,
  zauzeti,
}: {
  dok: KursUredjivanje;
  menjaj: (f: (d: KursUredjivanje) => KursUredjivanje) => void;
  zauzeti: Set<string>;
}) {
  const [filter, setFilter] = useState("");
  const [nov, setNov] = useState("");
  const [nivoNovog, setNivoNovog] = useState(dok.nivoi[0].id);
  const promeni = (id: string, polje: "pojam" | "opis" | "nivo", v: string) =>
    menjaj((d) => ({ ...d, pojmovi: d.pojmovi.map((p) => (p.id === id ? { ...p, [polje]: v } : p)) }));
  const prikazani = dok.pojmovi.filter((p) => !filter || p.nivo === filter);

  return (
    <>
      <div className="ur-nivo-glava">
        <h2 className="sec-adm">Pojmovi</h2>
        <select className="inp ur-filter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Nivo">
          <option value="">Svi nivoi ({dok.pojmovi.length})</option>
          {dok.nivoi.map((n) => (
            <option key={n.id} value={n.id}>
              Nivo {n.n} · {n.title}
            </option>
          ))}
        </select>
      </div>
      <p className="sub">Rečnik u aplikaciji; pojam se otključava sa svojim nivoom.</p>
      <form
        className="forma"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nov.trim()) return;
          const p = { id: noviIdPojma(nov, zauzeti), nivo: nivoNovog, pojam: nov.trim(), opis: "" };
          menjaj((d) => ({ ...d, pojmovi: [...d.pojmovi, p] }));
          setNov("");
          setFilter(nivoNovog);
        }}
      >
        <label>
          Novi pojam
          <input className="inp" value={nov} onChange={(e) => setNov(e.target.value)} />
        </label>
        <label>
          Nivo
          <select className="inp" value={nivoNovog} onChange={(e) => setNivoNovog(e.target.value)}>
            {dok.nivoi.map((n) => (
              <option key={n.id} value={n.id}>
                Nivo {n.n} · {n.title}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn" disabled={!nov.trim()}>
          + Dodaj pojam
        </button>
      </form>
      <ul className="ur-pojmovi">
        {prikazani.map((p) => (
          <li key={p.id} className="panel">
            <div className="ur-niz">
              <label className="ur-polje">
                <span>Pojam</span>
                <input className="inp" value={p.pojam} onChange={(e) => promeni(p.id, "pojam", e.target.value)} />
              </label>
              <label className="ur-polje ur-kratko">
                <span>Nivo</span>
                <select className="inp" value={p.nivo} onChange={(e) => promeni(p.id, "nivo", e.target.value)}>
                  {dok.nivoi.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.n}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-ghost ur-brisi"
                onClick={() => confirm(`Obrisati pojam „${p.pojam}“?`) && menjaj((d) => ({ ...d, pojmovi: d.pojmovi.filter((x) => x.id !== p.id) }))}
              >
                Obriši
              </button>
            </div>
            <Tekst naziv="Opis" vrednost={p.opis} promeni={(v) => promeni(p.id, "opis", v)} vise />
          </li>
        ))}
      </ul>
    </>
  );
}

function Podesavanja({ dok, menjaj }: { dok: KursUredjivanje; menjaj: (f: (d: KursUredjivanje) => KursUredjivanje) => void }) {
  const p = dok.podesavanja;
  const set = (polje: keyof typeof p) => (v: number) => menjaj((d) => ({ ...d, podesavanja: { ...d.podesavanja, [polje]: v } }));
  return (
    <div className="ur-forma">
      <h2 className="sec-adm">Podešavanja</h2>
      <div className="ur-niz">
        <Broj naziv="Prag za prolaz testa (0.5–1)" vrednost={p.prag} promeni={set("prag")} korak={0.05} />
        <Broj naziv="Pitanja na testu (5–50)" vrednost={p.test_pitanja} promeni={set("test_pitanja")} korak={1} />
        <Broj naziv="Dnevni cilj u zrnima (10–1000)" vrednost={p.dnevni_cilj} promeni={set("dnevni_cilj")} korak={10} />
      </div>
      <p className="sub">
        Prag {Math.round(p.prag * 100)}%: polaznik mora tačno da odgovori na bar {Math.ceil(p.prag * p.test_pitanja)} od {p.test_pitanja} pitanja.
        Već izdati sertifikati ostaju.
      </p>
    </div>
  );
}

function Objava({ nacrt, zatvori, objavljeno }: { nacrt: NacrtOut; zatvori: () => void; objavljeno: (v: number) => void }) {
  const [napomena, setNapomena] = useState("");
  const [salje, setSalje] = useState(false);
  const [greska, setGreska] = useState("");
  const grupe = (["dodato", "izmenjeno", "obrisano"] as const).map((v) => ({ v, stavke: nacrt.izmene.filter((x) => x.vrsta === v) }));

  return (
    <div className="ur-modal" role="dialog" aria-modal="true" aria-labelledby="objava-naslov" onClick={(e) => e.target === e.currentTarget && zatvori()}>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setSalje(true);
          setGreska("");
          try {
            objavljeno((await objaviNacrt(napomena.trim())).verzija);
          } catch (err) {
            setGreska((err as Error).message);
            setSalje(false);
          }
        }}
      >
        <h2 id="objava-naslov" className="sec-adm">
          Objaviti v{nacrt.osnova + 1}?
        </h2>
        <p className="sub">Polaznici dobijaju novu verziju odmah. Napredak, zrna i sertifikati ostaju; obrisana pitanja ostaju u statistici.</p>
        {grupe
          .filter((g) => g.stavke.length)
          .map((g) => (
            <div key={g.v} className="ur-izmene">
              <b className={`znak ur-${g.v}`}>
                {g.v} ({g.stavke.length})
              </b>
              <ul>
                {g.stavke.map((x) => (
                  <li key={x.id}>
                    {x.opis} <span className="mono">{x.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        <label className="ur-polje">
          <span>Napomena (šta je promenjeno i zašto)</span>
          <input className="inp" value={napomena} onChange={(e) => setNapomena(e.target.value)} autoFocus />
        </label>
        {greska && <p className="ur-greska">{greska}</p>}
        <div className="ur-akcije">
          <button type="button" className="btn btn-ghost" onClick={zatvori}>
            Odustani
          </button>
          <button type="submit" className="btn btn-gold" disabled={salje || napomena.trim().length < 3}>
            {salje ? "Objavljujem…" : `Objavi v${nacrt.osnova + 1}`}
          </button>
        </div>
      </form>
    </div>
  );
}
