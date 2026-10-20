"use client";

import { useCallback, useEffect, useState } from "react";
import { api, posalji } from "@/lib/api";
import type { Lokal } from "@/lib/types";

export default function LokaliStrana() {
  const [lokali, setLokali] = useState<Lokal[] | null>(null);
  const [forma, setForma] = useState({ naziv: "", grad: "" });
  const [greska, setGreska] = useState("");

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
          <p className="eyebrow">Admin</p>
          <h1 className="h1">Lokali</h1>
        </div>
      </div>
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
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lokali.map((l) => (
              <tr key={l.id}>
                <td>{l.naziv}</td>
                <td>{l.grad ?? "–"}</td>
                <td>
                  <span className={`znak znak-${l.aktivan ? "aktivan" : "iskljucen"}`}>{l.aktivan ? "Aktivan" : "Zatvoren"}</span>
                </td>
                <td>
                  <div className="akcije">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => sacuvaj({ naziv: l.naziv, grad: l.grad, aktivan: !l.aktivan }, l)}
                    >
                      {l.aktivan ? "Zatvori" : "Otvori"}
                    </button>
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
