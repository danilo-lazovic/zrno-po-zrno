"use client";

import { useState } from "react";

export type Stub = { oznaka: string; vrednost: number; opis: string };

/**
 * Vertikalni stubići, jedna serija (bez legende; naslov panela kaže šta je).
 * Broj stoji samo na najvišem i poslednjem stubiću, ostalo je u tooltipu; "Tabela" daje iste brojeve kao tekst.
 */
export function Stubici({ podaci, naslov }: { podaci: Stub[]; naslov: string }) {
  const [aktivan, setAktivan] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const max = Math.max(1, ...podaci.map((d) => d.vrednost));
  const najvisi = podaci.reduce((m, d, i) => (d.vrednost > podaci[m].vrednost ? i : m), 0);

  return (
    <div className="panel">
      <div className="panel-glava">
        <h2>{naslov}</h2>
        <button type="button" className="linkish" onClick={() => setTabela(!tabela)} aria-pressed={tabela}>
          {tabela ? "Grafikon" : "Tabela"}
        </button>
      </div>
      {tabela ? (
        <table className="tabela">
          <tbody>
            {podaci.map((d) => (
              <tr key={d.oznaka}>
                <td>{d.opis}</td>
                <td className="mono">{d.vrednost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <div className="stubici" style={{ "--n": podaci.length } as React.CSSProperties} role="img" aria-label={naslov}>
            {podaci.map((d, i) => (
              <button
                key={d.oznaka}
                type="button"
                className={`stub${d.vrednost ? "" : " prazan"}`}
                aria-label={d.opis}
                onMouseEnter={() => setAktivan(i)}
                onMouseLeave={() => setAktivan(null)}
                onFocus={() => setAktivan(i)}
                onBlur={() => setAktivan(null)}
              >
                <i style={{ height: `${(d.vrednost / max) * 100}%` }}>
                  {d.vrednost > 0 && (i === najvisi || i === podaci.length - 1) && <em>{d.vrednost}</em>}
                </i>
              </button>
            ))}
            {aktivan !== null && (
              <div
                className="tooltip"
                // unutar grafikona, da ne prekrije naslov; uz ivice se ne seče
                style={{ left: `${Math.min(80, Math.max(20, ((aktivan + 0.5) / podaci.length) * 100))}%`, top: 4 }}
              >
                {podaci[aktivan].opis}
              </div>
            )}
          </div>
          <div className="stubici-ose" style={{ "--n": podaci.length } as React.CSSProperties} aria-hidden="true">
            {podaci.map((d, i) => (
              <span key={d.oznaka}>{i % 2 === podaci.length % 2 ? "" : d.oznaka}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Vodoravni stubići (levak): svaki red ima broj i udeo u odnosu na prvi red. */
export function Levak({ redovi, naslov }: { redovi: { naziv: string; broj: number }[]; naslov: string }) {
  const osnova = Math.max(1, redovi[0]?.broj ?? 0);
  return (
    <div className="panel">
      <div className="panel-glava">
        <h2>{naslov}</h2>
      </div>
      <ul className="levak">
        {redovi.map((r) => (
          <li key={r.naziv} title={`${r.naziv}: ${r.broj}`}>
            <span>{r.naziv}</span>
            <span className="traka">
              <i style={{ width: `${(r.broj / osnova) * 100}%` }} />
            </span>
            <b>
              {r.broj} · {Math.round((r.broj / osnova) * 100)}%
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Procenat({ v }: { v: number }) {
  return (
    <span className="procenat">
      <b>{v}%</b>
      <span className="traka">
        <i style={{ width: `${v}%` }} />
      </span>
    </span>
  );
}
