"use client";

import { useCallback, useEffect, useState } from "react";
import { api, posalji } from "@/lib/api";
import { datumVreme } from "@/lib/format";
import { type Lokal, NAZIV_ULOGE, type Osoblje } from "@/lib/types";

const PRAZNA = { ime: "", prezime: "", email: "", uloga: "trener", lozinka: "", lokal_id: "" };

export default function OsobljeStrana() {
  const [osoblje, setOsoblje] = useState<Osoblje[] | null>(null);
  const [lokali, setLokali] = useState<Lokal[]>([]);
  const [forma, setForma] = useState(PRAZNA);
  const [greska, setGreska] = useState("");

  const ucitaj = useCallback(() => {
    api<Osoblje[]>("/api/admin/osoblje").then(setOsoblje).catch((e: Error) => setGreska(e.message));
  }, []);
  useEffect(() => {
    ucitaj();
    api<Lokal[]>("/api/admin/lokali").then(setLokali).catch(() => {});
  }, [ucitaj]);

  async function dodaj(e: React.FormEvent) {
    e.preventDefault();
    setGreska("");
    const { lokal_id, ...telo } = forma;
    try {
      await posalji("/api/admin/osoblje", "POST", { ...telo, lokal_ids: lokal_id ? [Number(lokal_id)] : [] });
      setForma(PRAZNA);
      ucitaj();
    } catch (err) {
      setGreska((err as Error).message);
    }
  }

  async function izmeni(o: Osoblje, telo: object, pitanje?: string) {
    if (pitanje && !window.confirm(pitanje)) return;
    setGreska("");
    try {
      await posalji(`/api/admin/osoblje/${o.id}`, "PATCH", telo);
      ucitaj();
    } catch (err) {
      setGreska((err as Error).message);
    }
  }

  function novaLozinka(o: Osoblje) {
    const lozinka = window.prompt(`Nova lozinka za ${o.ime} ${o.prezime} (najmanje 10 znakova):`);
    if (lozinka) izmeni(o, { lozinka });
  }

  return (
    <>
      <div className="adm-glava">
        <div>
          <h1 className="h1">Osoblje</h1>
        </div>
      </div>
      <form className="forma card" onSubmit={dodaj}>
        <label>
          Ime
          <input className="inp" value={forma.ime} onChange={(e) => setForma({ ...forma, ime: e.target.value })} required />
        </label>
        <label>
          Prezime
          <input className="inp" value={forma.prezime} onChange={(e) => setForma({ ...forma, prezime: e.target.value })} required />
        </label>
        <label>
          Email
          <input className="inp" type="email" value={forma.email} onChange={(e) => setForma({ ...forma, email: e.target.value })} required />
        </label>
        <label>
          Uloga
          <select className="inp" value={forma.uloga} onChange={(e) => setForma({ ...forma, uloga: e.target.value })}>
            <option value="trener">Trener</option>
            <option value="menadzer">Menadžer lokala</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {forma.uloga === "menadzer" && (
          <label>
            Lokal
            <select className="inp" value={forma.lokal_id} onChange={(e) => setForma({ ...forma, lokal_id: e.target.value })} required>
              <option value="">Izaberi…</option>
              {lokali.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.naziv}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Početna lozinka
          <input
            className="inp"
            type="text"
            minLength={10}
            value={forma.lozinka}
            onChange={(e) => setForma({ ...forma, lozinka: e.target.value })}
            autoComplete="new-password"
            required
          />
        </label>
        <button type="submit" className="btn btn-gold">
          Otvori nalog
        </button>
        {greska && (
          <p className="greska" role="alert">
            {greska}
          </p>
        )}
      </form>
      {osoblje && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Ime</th>
              <th>Email</th>
              <th>Uloga</th>
              <th>Lokali</th>
              <th>Poslednja prijava</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {osoblje.map((o) => (
              <tr key={o.id}>
                <td>
                  {o.ime} {o.prezime} {!o.aktivan && <span className="znak znak-iskljucen">Isključen</span>}
                </td>
                <td className="mono">{o.email}</td>
                <td>{NAZIV_ULOGE[o.uloga]}</td>
                <td>{o.lokali.map((l) => l.naziv).join(", ") || "–"}</td>
                <td className="mono">{datumVreme(o.poslednja_prijava)}</td>
                <td>
                  <div className="akcije">
                    <button type="button" className="btn" onClick={() => novaLozinka(o)}>
                      Nova lozinka
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        izmeni(o, { aktivan: !o.aktivan }, o.aktivan ? `Isključiti nalog ${o.email}?` : undefined)
                      }
                    >
                      {o.aktivan ? "Isključi" : "Uključi"}
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
