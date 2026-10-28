"use client";

import { useEffect, useState } from "react";
import { Procenat } from "@/components/admin/grafikoni";
import { IzborLokala } from "@/components/admin/IzborLokala";
import { KATEGORIJE } from "@/igre/smena/model";
import { upit, useAdminKurs } from "@/lib/adminKurs";
import { api } from "@/lib/api";
import type { IgraStat } from "@/lib/statistika";

export default function IgreStrana() {
  const [lokal, setLokal] = useState("");
  const [lista, setLista] = useState<IgraStat[] | null>(null);
  const [greska, setGreska] = useState("");
  const kurs = useAdminKurs();

  useEffect(() => {
    if (!kurs) return;
    setLista(null);
    api<IgraStat[]>(`/api/admin/statistika/igre${upit(kurs, { lokal_id: lokal })}`).then(setLista).catch((e: Error) => setGreska(e.message));
  }, [lokal, kurs]);

  return (
    <>
      <div className="adm-glava">
        <div>
          <h1 className="h1">Igre</h1>
        </div>
        <div className="filteri">
          <IzborLokala vrednost={lokal} promeni={setLokal} />
        </div>
      </div>
      <p className="sub" style={{ marginBottom: 16 }}>
        Igranja iz igraonice i iz lekcija.
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
      {lista?.map(
        (g) =>
          g.stanice && (
            <section className="panel" key={`st-${g.igra}`} style={{ marginTop: 16 }}>
              <h2 className="h2">{g.naziv}: stanice</h2>
              <p className="sub">Najniži red treba vežbati za šankom.</p>
              <table className="tabela">
                <tbody>
                  {KATEGORIJE.filter((c) => g.stanice![c.id] != null)
                    .sort((a, b) => g.stanice![a.id] - g.stanice![b.id])
                    .map((c) => (
                      <tr key={c.id}>
                        <td>{c.naziv}</td>
                        <td>
                          <Procenat v={g.stanice![c.id]} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          ),
      )}
    </>
  );
}
