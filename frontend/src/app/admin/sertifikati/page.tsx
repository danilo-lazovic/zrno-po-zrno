"use client";

import { useCallback, useEffect, useState } from "react";
import { api, posalji } from "@/lib/api";
import { datumVreme } from "@/lib/format";
import type { Lokal, Me } from "@/lib/types";

type SertifikatAdmin = {
  id: number;
  kod: string;
  procenat: number;
  izdat_u: string;
  opozvan_u: string | null;
  razlog_opoziva: string | null;
  ime: string;
  prezime: string;
  korisnicko_ime: string;
  lokal: Lokal | null;
  kurs: string;
};

export default function SertifikatiStrana() {
  const [lista, setLista] = useState<SertifikatAdmin[] | null>(null);
  const [kod, setKod] = useState("");
  const [nadjen, setNadjen] = useState<SertifikatAdmin | null>(null);
  const [greska, setGreska] = useState("");
  const [moguOpoziv, setMoguOpoziv] = useState(false);

  const ucitaj = useCallback(() => {
    api<SertifikatAdmin[]>("/api/admin/sertifikati").then(setLista).catch((e: Error) => setGreska(e.message));
  }, []);
  useEffect(() => {
    ucitaj();
    api<Me>("/api/me").then((me) => setMoguOpoziv(["admin", "trener"].includes(me.korisnik.uloga)));
  }, [ucitaj]);

  async function proveri(e: React.FormEvent) {
    e.preventDefault();
    setGreska("");
    setNadjen(null);
    try {
      setNadjen(await api<SertifikatAdmin>(`/api/admin/sertifikati/${encodeURIComponent(kod.trim())}`));
    } catch (err) {
      setGreska((err as Error).message);
    }
  }

  async function opozovi(s: SertifikatAdmin) {
    const razlog = window.prompt(
      `Opozvati sertifikat ${s.kod} (${s.ime} ${s.prezime})? Polaznik mora ponovo da položi test. Razlog:`,
    );
    if (!razlog) return;
    try {
      const o = await posalji<SertifikatAdmin>(`/api/admin/sertifikati/${s.id}/opozovi`, "POST", { razlog });
      if (nadjen?.id === o.id) setNadjen(o);
      ucitaj();
    } catch (err) {
      setGreska((err as Error).message);
    }
  }

  return (
    <>
      <div className="adm-glava">
        <div>
          <h1 className="h1">Sertifikati</h1>
        </div>
      </div>

      <form className="forma card" onSubmit={proveri}>
        <label>
          Kod sa sertifikata
          <input
            className="inp mono"
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            placeholder="ZP-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
          />
        </label>
        <button type="submit" className="btn btn-gold">
          Proveri kod
        </button>
        {greska && (
          <p className="greska" role="alert">
            {greska}
          </p>
        )}
      </form>

      {nadjen && (
        <div className={`card link-kartica${nadjen.opozvan_u ? " opozvan" : ""}`} role="status">
          <p className="eyebrow">{nadjen.opozvan_u ? "Kod je opozvan" : "Kod je ispravan"}</p>
          <h2 className="h2">
            {nadjen.ime} {nadjen.prezime}
          </h2>
          <p className="sub">
            {nadjen.kurs} · {nadjen.lokal?.naziv ?? "Bez lokala"} · {nadjen.korisnicko_ime} · položeno {nadjen.procenat}% ·{" "}
            {datumVreme(nadjen.izdat_u)}
          </p>
          {nadjen.opozvan_u && (
            <p className="note bad">
              Opozvan {datumVreme(nadjen.opozvan_u)}: {nadjen.razlog_opoziva}
            </p>
          )}
        </div>
      )}

      {lista && lista.length === 0 && <div className="prazno">Još niko nije položio završni test.</div>}
      {lista && lista.length > 0 && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Polaznik</th>
              <th>Lokal</th>
              <th>Kurs</th>
              <th>Kod</th>
              <th>Rezultat</th>
              <th>Izdat</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.ime} {s.prezime}
                </td>
                <td>{s.lokal?.naziv ?? "–"}</td>
                <td>{s.kurs}</td>
                <td className="mono">{s.kod}</td>
                <td className="mono">{s.procenat}%</td>
                <td className="mono">{datumVreme(s.izdat_u)}</td>
                <td>
                  <span className={`znak znak-${s.opozvan_u ? "iskljucen" : "aktivan"}`} title={s.razlog_opoziva ?? undefined}>
                    {s.opozvan_u ? "Opozvan" : "Važi"}
                  </span>
                </td>
                <td>
                  <div className="akcije">
                    {moguOpoziv && !s.opozvan_u && (
                      <button type="button" className="btn btn-ghost" onClick={() => opozovi(s)}>
                        Opozovi
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
