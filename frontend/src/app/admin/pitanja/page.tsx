"use client";

import { useEffect, useState } from "react";
import { Procenat } from "@/components/admin/grafikoni";
import { IzborLokala } from "@/components/admin/IzborLokala";
import { useAdminKurs } from "@/lib/adminKurs";
import { api } from "@/lib/api";
import { type PitanjeStat, TIP_PITANJA } from "@/lib/statistika";

export default function PitanjaStrana() {
  const [lokal, setLokal] = useState("");
  const [kontekst, setKontekst] = useState("");
  const [lista, setLista] = useState<PitanjeStat[] | null>(null);
  const [greska, setGreska] = useState("");
  const kurs = useAdminKurs();

  useEffect(() => {
    if (!kurs) return;
    const p = new URLSearchParams({ kurs, min_odgovora: "3" });
    if (lokal) p.set("lokal_id", lokal);
    if (kontekst) p.set("kontekst", kontekst);
    setLista(null);
    api<PitanjeStat[]>(`/api/admin/statistika/pitanja?${p}`).then(setLista).catch((e: Error) => setGreska(e.message));
  }, [lokal, kontekst, kurs]);

  return (
    <>
      <div className="adm-glava">
        <div>
          <h1 className="h1">Pitanja</h1>
        </div>
        <div className="filteri">
          <select className="inp" value={kontekst} onChange={(e) => setKontekst(e.target.value)} aria-label="Gde">
            <option value="">Lekcije i test</option>
            <option value="lekcija">Samo lekcije</option>
            <option value="test">Samo završni test</option>
          </select>
          <IzborLokala vrednost={lokal} promeni={setLokal} />
        </div>
      </div>
      <p className="sub" style={{ marginBottom: 16 }}>
        Najteža pitanja su prva: tu gradivo treba bolje objasniti.
      </p>
      {greska && <p className="note bad">{greska}</p>}
      {lista === null ? (
        <p className="sub">Učitavam…</p>
      ) : lista.length === 0 ? (
        <div className="prazno">Još nema dovoljno odgovora.</div>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Nivo</th>
              <th>Pitanje</th>
              <th>Vrsta</th>
              <th>Odgovora</th>
              <th>Tačnost</th>
              <th>Najčešći pogrešan odgovor</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((q) => (
              <tr key={q.kljuc}>
                <td className="mono">{q.nivo.toUpperCase()}</td>
                <td title={q.kljuc}>{q.tekst}</td>
                <td>{TIP_PITANJA[q.tip] ?? q.tip}</td>
                <td className="mono">{q.odgovora}</td>
                <td>
                  <Procenat v={q.tacnost} />
                </td>
                <td>{q.najcesci_pogresan ? `${q.najcesci_pogresan} (${q.pogresan_puta}×)` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
