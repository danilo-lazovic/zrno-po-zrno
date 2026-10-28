"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IzborLokala } from "@/components/admin/IzborLokala";
import { useAdminKurs } from "@/lib/adminKurs";
import { type RangLokala, opsegNedelje, ucitajRangOsoblje } from "@/lib/rang";

const NEDELJE = [
  [0, "Ova nedelja"],
  [-1, "Prošla nedelja"],
  [-2, "Pre 2 nedelje"],
  [-3, "Pre 3 nedelje"],
  [-4, "Pre 4 nedelje"],
] as const;

export default function RangStrana() {
  const [pomak, setPomak] = useState(0);
  const [lokal, setLokal] = useState("");
  const [lokali, setLokali] = useState<RangLokala[] | null>(null);
  const [greska, setGreska] = useState("");
  const kurs = useAdminKurs();

  useEffect(() => {
    if (!kurs) return;
    ucitajRangOsoblje(kurs, pomak, lokal ? Number(lokal) : undefined)
      .then(setLokali)
      .catch((e: Error) => setGreska(e.message));
  }, [pomak, lokal, kurs]);

  return (
    <>
      <div className="adm-glava">
        <div>
          <h1 className="h1">Rang lista</h1>
        </div>
        <div className="filteri">
          <select className="inp" value={pomak} onChange={(e) => setPomak(Number(e.target.value))} aria-label="Nedelja">
            {NEDELJE.map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
          <IzborLokala vrednost={lokal} promeni={setLokal} />
        </div>
      </div>
      <p className="sub" style={{ marginBottom: 16 }}>
        Zrna od ponedeljka do nedelje{lokali?.[0] ? ` (${opsegNedelje(lokali[0])})` : ""}.
      </p>
      {greska && <p className="note bad">{greska}</p>}
      {lokali && lokali.length === 0 && <p className="prazno">Nema lokala.</p>}
      <div className="mreza2">
        {lokali?.map((l) => (
          <section key={l.lokal_id} className="panel">
            <div className="panel-glava">
              <h2>{l.lokal}</h2>
              <span className="sub">
                {l.redovi.filter((x) => x.zrna > 0).length}/{l.polaznika} aktivnih
              </span>
            </div>
            {l.redovi.length ? (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Polaznik</th>
                    <th style={{ textAlign: "right" }}>Zrna</th>
                  </tr>
                </thead>
                <tbody>
                  {l.redovi.map((x) => (
                    <tr key={x.korisnik_id}>
                      <td className="mono">{x.zrna > 0 ? x.mesto : "–"}</td>
                      <td>
                        <Link href={`/admin/polaznici/${x.korisnik_id}`}>{x.ime}</Link>
                      </td>
                      <td className="mono" style={{ textAlign: "right" }}>
                        {x.zrna}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="prazno">Nema polaznika sa postavljenim PIN-om.</p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
