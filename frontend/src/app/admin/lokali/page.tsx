"use client";

import { useCallback, useEffect, useState } from "react";
import { api, posalji } from "@/lib/api";
import type { Lokal } from "@/lib/types";

export default function LokaliStrana() {
  const [lokali, setLokali] = useState<Lokal[] | null>(null);
  const [forma, setForma] = useState({ naziv: "", grad: "" });
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [preuzima, setPreuzima] = useState(false);

  async function izPortala() {
    setGreska("");
    setPoruka("");
    setPreuzima(true);
    try {
      const r = await posalji<{ novih: number; izmenjenih: number; zatvorenih: number; ukupno: number }>(
        "/api/admin/lokali/portal",
        "POST",
      );
      setPoruka(`Lokala u portalu: ${r.ukupno}. Novih ${r.novih}, izmenjenih ${r.izmenjenih}, zatvorenih ${r.zatvorenih}.`);
      ucitaj();
    } catch (err) {
      setGreska((err as Error).message);
    } finally {
      setPreuzima(false);
    }
  }

  const ucitaj = useCallback(() => {
    api<Lokal[]>("/api/admin/lokali").then(setLokali).catch((e: Error) => setGreska(e.message));
  }, []);
  useEffect(ucitaj, [ucitaj]);

  async function sacuvaj(telo: object, lokal?: Lokal) {
    setGreska("");
    try {
      await posalji(lokal ? `/api/admin/lokali/${lokal.id}` : "/api/admin/lokali", lokal ? "PATCH" : "POST", telo);
      if (!lokal) setForma({ naziv: "", grad: "" });
      ucitaj();
    } catch (err) {
      setGreska((err as Error).message);
    }
  }

  return (
    <>
      <div className="adm-glava">
        <div>
          <h1 className="h1">Lokali</h1>
        </div>
        <button type="button" className="btn btn-gold" onClick={izPortala} disabled={preuzima}>
          {preuzima ? "Preuzimam…" : "Preuzmi iz portala"}
        </button>
      </div>
      <p className="sub" style={{ marginBottom: 16 }}>
        Lokali stižu iz Kafeterija Portala. Ručno dodaj samo lokal kog tamo još nema.
      </p>
      {poruka && (
        <p className="note ok" role="status">
          {poruka}
        </p>
      )}
      <form
        className="forma card"
        onSubmit={(e) => {
          e.preventDefault();
          sacuvaj({ naziv: forma.naziv, grad: forma.grad || null });
        }}
      >
        <label>
          Naziv
          <input className="inp" value={forma.naziv} onChange={(e) => setForma({ ...forma, naziv: e.target.value })} required />
        </label>
        <label>
          Grad
          <input className="inp" value={forma.grad} onChange={(e) => setForma({ ...forma, grad: e.target.value })} />
        </label>
        <button type="submit" className="btn btn-gold">
          Dodaj lokal
        </button>
        {greska && (
          <p className="greska" role="alert">
            {greska}
          </p>
        )}
      </form>
      {lokali && lokali.length === 0 && <div className="prazno">Nema lokala. Dodaj prvi iznad.</div>}
      {lokali && lokali.length > 0 && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Naziv</th>
              <th>Grad</th>
              <th>Format</th>
              <th>Izvor</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lokali.map((l) => (
              <tr key={l.id}>
                <td>{l.naziv}</td>
                <td>{l.grad ?? "–"}</td>
                <td>{l.format ?? "–"}</td>
                <td className="mono">{l.izvor === "portal" ? "portal" : l.izvor === "demo" ? "demo" : "ručno"}</td>
                <td>
                  <span className={`znak znak-${l.aktivan ? "aktivan" : "iskljucen"}`}>{l.aktivan ? "Aktivan" : "Zatvoren"}</span>
                </td>
                <td>
                  <div className="akcije">
                    {l.izvor !== "portal" && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => sacuvaj({ naziv: l.naziv, grad: l.grad, aktivan: !l.aktivan }, l)}
                      >
                        {l.aktivan ? "Zatvori" : "Otvori"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
