"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Procenat } from "@/components/admin/grafikoni";
import { upit, useAdminKurs } from "@/lib/adminKurs";
import { api } from "@/lib/api";
import { datumVreme } from "@/lib/format";
import { type Detalj, TIP_PITANJA } from "@/lib/statistika";

const NAZIV_IGRE: Record<string, string> = {
  swipe: "Brza runda",
  dialin: "Uštimaj mlin",
  recipe: "Složi recept",
  milk: "Kralj pare",
  latte: "Sipaj srce",
};

export default function PolaznikDetalj({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Detalj | null>(null);
  const [greska, setGreska] = useState("");
  const kurs = useAdminKurs();

  useEffect(() => {
    if (!kurs) return;
    api<Detalj>(`/api/admin/polaznici/${id}/detalj${upit(kurs)}`).then(setD).catch((e: Error) => setGreska(e.message));
  }, [id, kurs]);

  if (greska) return <p className="note bad">{greska}</p>;
  if (!d) return <p className="sub">Učitavam…</p>;

  const zavrseno = d.nivoi.filter((n) => n.zavrsen_u).length;
  const najboljiTest = Math.max(0, ...d.testovi.map((t) => t.procenat ?? 0));
  return (
    <>
      <div className="adm-glava">
        <div>
          <p className="eyebrow">
            <Link href="/admin/polaznici">Polaznici</Link> · {d.lokal ?? "bez lokala"} · {d.korisnicko_ime}
          </p>
          <h1 className="h1">
            {d.ime} {d.prezime}
          </h1>
        </div>
      </div>

      <div className="kpi">
        <div>
          <b>{zavrseno}/8</b>
          <span>nivoa</span>
        </div>
        <div>
          <b>{d.zrna}</b>
          <span>zrna</span>
        </div>
        <div>
          <b>{d.testovi.some((t) => t.procenat !== null) ? `${najboljiTest}%` : "–"}</b>
          <span>najbolji test</span>
          {d.sertifikat && <small className="mono">{d.sertifikat}</small>}
        </div>
        <div>
          <b>{d.bedzevi.length}</b>
          <span>bedževa</span>
          {d.bedzevi.length > 0 && <small>{d.bedzevi.join(", ")}</small>}
        </div>
      </div>

      <h2 className="sec-adm">Nivoi</h2>
      <table className="tabela">
        <thead>
          <tr>
            <th>Nivo</th>
            <th>Završen</th>
            <th>Zvezdice</th>
            <th>Najbolje</th>
            <th>Tačnost svih odgovora</th>
            <th>Prolazaka</th>
          </tr>
        </thead>
        <tbody>
          {d.nivoi.map((n) => (
            <tr key={n.nivo}>
              <td>{n.naziv}</td>
              <td className="mono">{n.zavrsen_u ? datumVreme(n.zavrsen_u) : "–"}</td>
              <td className="zv" aria-label={`${n.zvezdice} od 3`}>
                {n.zavrsen_u ? "★".repeat(n.zvezdice) + "☆".repeat(3 - n.zvezdice) : "–"}
              </td>
              <td className="mono">{n.zavrsen_u ? `${n.najbolje}%` : "–"}</td>
              <td>{n.tacnost_odgovora === null ? "–" : <Procenat v={n.tacnost_odgovora} />}</td>
              <td className="mono">{n.prolazaka || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mreza2" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="panel-glava">
            <h2>Najslabija pitanja</h2>
          </div>
          {d.najslabija_pitanja.length === 0 ? (
            <p className="sub">Nema pogrešnih odgovora.</p>
          ) : (
            <table className="tabela">
              <tbody>
                {d.najslabija_pitanja.map((q) => (
                  <tr key={q.kljuc}>
                    <td title={`${q.kljuc} · ${TIP_PITANJA[q.tip] ?? q.tip}`}>{q.tekst}</td>
                    <td>
                      <Procenat v={q.tacnost} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="panel">
          <div className="panel-glava">
            <h2>Završni test i igre</h2>
          </div>
          {d.testovi.length === 0 && Object.keys(d.igre).length === 0 && <p className="sub">Još ništa.</p>}
          <ul className="linija">
            {d.testovi.map((t) => (
              <li key={t.pocetak}>
                <time>{datumVreme(t.kraj ?? t.pocetak)}</time>
                <span>{t.procenat === null ? "Test prekinut" : `Test: ${t.procenat}%${t.polozen ? " · položen" : ""}`}</span>
              </li>
            ))}
            {Object.entries(d.igre).map(([igra, v]) => (
              <li key={igra}>
                <time>rekord</time>
                <span>
                  {NAZIV_IGRE[igra] ?? igra}: {v}
                  {igra === "swipe" ? " poena" : "%"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className="sec-adm">Šta je radio</h2>
      {d.dogadjaji.length === 0 ? (
        <div className="prazno">Još nema aktivnosti.</div>
      ) : (
        <ul className="linija panel">
          {d.dogadjaji.map((e, i) => (
            <li key={i}>
              <time>{datumVreme(e.u)}</time>
              <span>{e.opis}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
