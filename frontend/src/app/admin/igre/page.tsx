"use client";

import { useEffect, useState } from "react";
import { Procenat } from "@/components/admin/grafikoni";
import { IzborLokala } from "@/components/admin/IzborLokala";
import { api } from "@/lib/api";
import { type IgraStat, sa } from "@/lib/statistika";

export default function IgreStrana() {
  const [lokal, setLokal] = useState("");
  const [lista, setLista] = useState<IgraStat[] | null>(null);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    setLista(null);
    api<IgraStat[]>(`/api/admin/statistika/igre${sa(lokal)}`).then(setLista).catch((e: Error) => setGreska(e.message));
  }, [lokal]);

  return (
    <>
      <div className="adm-glava">
        <div>
          <p className="eyebrow">Admin · statistika</p>
          <h1 className="h1">Igre</h1>
        </div>
        <div className="filteri">
          <IzborLokala vrednost={lokal} promeni={setLokal} />
        </div>
      </div>
      <p className="sub" style={{ marginBottom: 16 }}>
        Igranja iz igraonice i iz lekcija. Kolona Unity broji igranja Unity verzije, za poređenje sa JS verzijom.
      </p>
      {greska && <p className="note bad">{greska}</p>}
      {lista && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Igra</th>
              <th>Igranja</th>
              <th>Igrača</th>
              <th>Prosečan rezultat</th>
              <th>Tri zvezdice</th>
              <th>Iz lekcija</th>
              <th>Unity</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((g) => (
              <tr key={g.igra}>
                <td>{g.naziv}</td>
                <td className="mono">{g.igranja}</td>
                <td className="mono">{g.igraca}</td>
                <td>{g.igranja ? <Procenat v={g.prosek} /> : "–"}</td>
                <td className="mono">{g.igranja ? `${g.tri_zvezdice}%` : "–"}</td>
                <td className="mono">{g.iz_lekcija}</td>
                <td className="mono">{g.unity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
