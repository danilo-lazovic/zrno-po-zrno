"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { datumVreme } from "@/lib/format";
import type { Verzija } from "@/lib/types";

export default function SadrzajStrana() {
  const [verzije, setVerzije] = useState<Verzija[] | null>(null);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    api<Verzija[]>("/api/admin/sadrzaj/verzije").then(setVerzije).catch((e: Error) => setGreska(e.message));
  }, []);

  return (
    <>
      <div className="adm-glava">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="h1">Sadržaj</h1>
        </div>
        <Link href="/admin/sadrzaj/uredi" className="btn btn-gold">
          Uredi sadržaj
        </Link>
      </div>
      <p className="sub" style={{ marginBottom: 16 }}>
        Izmene se prave u nacrtu i ne vide se polaznicima dok se ne objave. Svaka objava pravi novu verziju kursa sa napomenom
        šta je promenjeno; polaznici dobijaju poslednju objavljenu.
      </p>
      {greska && <p className="note bad">{greska}</p>}
      {verzije && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Kurs</th>
              <th>Verzija</th>
              <th>Status</th>
              <th>Nivoa</th>
              <th>Izazova</th>
              <th>Objavljena</th>
              <th>Napomena</th>
            </tr>
          </thead>
          <tbody>
            {verzije.map((v) => (
              <tr key={`${v.kurs}-${v.broj}`}>
                <td className="mono">{v.kurs}</td>
                <td className="mono">v{v.broj}</td>
                <td>{v.objavljena ? <span className="znak znak-aktivan">Objavljena</span> : <span className="znak">Ranija</span>}</td>
                <td>{v.nivoa}</td>
                <td>{v.objavljena ? v.izazova : "–"}</td>
                <td className="mono">{datumVreme(v.objavljena_u)}</td>
                <td>{v.napomena ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
