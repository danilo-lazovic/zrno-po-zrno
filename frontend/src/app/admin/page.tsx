"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Levak, Stubici } from "@/components/admin/grafikoni";
import { IzborLokala } from "@/components/admin/IzborLokala";
import { upit, useAdminKurs } from "@/lib/adminKurs";
import { api } from "@/lib/api";
import { datumVreme } from "@/lib/format";
import { type LokalStat, type Pregled, kratakDan } from "@/lib/statistika";

export default function PregledStrana() {
  const [lokal, setLokal] = useState("");
  const [p, setP] = useState<Pregled | null>(null);
  const [lokali, setLokali] = useState<LokalStat[] | null>(null);
  const [greska, setGreska] = useState("");
  const kurs = useAdminKurs();

  useEffect(() => {
    if (!kurs) return;
    setP(null);
    api<Pregled>(`/api/admin/statistika/pregled${upit(kurs, { lokal_id: lokal })}`).then(setP).catch((e: Error) => setGreska(e.message));
  }, [lokal, kurs]);
  useEffect(() => {
    if (!kurs) return;
    api<LokalStat[]>(`/api/admin/statistika/lokali${upit(kurs)}`).then(setLokali).catch(() => {});
  }, [kurs]);

  return (
    <>
      <div className="adm-glava">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="h1">Pregled</h1>
        </div>
        <div className="filteri">
          <IzborLokala vrednost={lokal} promeni={setLokal} />
        </div>
      </div>
      {greska && <p className="note bad">{greska}</p>}
      {!p ? (
        <p className="sub">Učitavam…</p>
      ) : (
        <>
          <div className="kpi">
            <div>
              <b>{p.polaznika}</b>
              <span>polaznika</span>
              {p.pozvanih > 0 && <small>{p.pozvanih} još bez PIN-a</small>}
            </div>
            <div>
              <b>{p.aktivnih_danas}</b>
              <span>aktivnih danas</span>
            </div>
            <div>
              <b>{p.aktivnih_7d}</b>
              <span>aktivnih 7 dana</span>
            </div>
            <div>
              <b>{p.zavrsili_sve_nivoe}</b>
              <span>završili sve nivoe</span>
            </div>
            <div>
              <b>{p.polozili_test}</b>
              <span>položili test</span>
              {p.prosek_testa !== null && <small>prosek najboljeg: {p.prosek_testa}%</small>}
            </div>
          </div>

          <div className="mreza2">
            <Stubici
              naslov="Aktivni polaznici po danu"
              podaci={p.aktivnost.map((d) => ({
                oznaka: kratakDan(d.dan),
                vrednost: d.polaznika,
                opis: `${kratakDan(d.dan)}: ${d.polaznika} aktivnih, ${d.zrna} zrna`,
              }))}
            />
            <Levak naslov="Dokle su stigli" redovi={p.levak.map((x) => ({ naziv: x.naziv, broj: x.polaznika }))} />
          </div>

          <h2 className="sec-adm">Zapeli (7+ dana bez aktivnosti)</h2>
          {p.zapeli.length === 0 ? (
            <div className="prazno">Niko nije zapeo. Svi koji su počeli bili su aktivni u poslednjih 7 dana ili su položili test.</div>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Polaznik</th>
                  <th>Lokal</th>
                  <th>Nivoa</th>
                  <th>Poslednja aktivnost</th>
                  <th>Dana</th>
                </tr>
              </thead>
              <tbody>
                {p.zapeli.map((z) => (
                  <tr key={z.id}>
                    <td>
                      <Link href={`/admin/polaznici/${z.id}`}>
                        {z.ime} {z.prezime}
                      </Link>
                    </td>
                    <td>{z.lokal ?? "–"}</td>
                    <td className="mono">{z.nivoa}/8</td>
                    <td className="mono">{z.poslednja_aktivnost ? datumVreme(z.poslednja_aktivnost) : "nikad"}</td>
                    <td className="mono">{z.dana_bez_aktivnosti}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {lokali && lokali.length > 1 && (
        <>
          <h2 className="sec-adm">Lokali</h2>
          <table className="tabela">
            <thead>
              <tr>
                <th>Lokal</th>
                <th>Polaznika</th>
                <th>Aktivnih 7 dana</th>
                <th>Prosek nivoa</th>
                <th>Položili test</th>
                <th>Prosek testa</th>
              </tr>
            </thead>
            <tbody>
              {lokali.map((l) => (
                <tr key={l.id}>
                  <td>
                    <button type="button" className="linkish" style={{ margin: 0, padding: 0 }} onClick={() => setLokal(String(l.id))}>
                      {l.naziv}
                    </button>
                  </td>
                  <td className="mono">{l.polaznika}</td>
                  <td className="mono">{l.aktivnih_7d}</td>
                  <td className="mono">{l.polaznika ? `${l.prosek_nivoa.toString().replace(".", ",")}/8` : "–"}</td>
                  <td className="mono">{l.polozili_test}</td>
                  <td className="mono">{l.prosek_testa === null ? "–" : `${l.prosek_testa}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
