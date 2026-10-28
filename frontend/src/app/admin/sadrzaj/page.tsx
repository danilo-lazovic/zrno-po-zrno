"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { KursAdmin } from "@/lib/adminKurs";
import { api, posalji } from "@/lib/api";
import { datumVreme } from "@/lib/format";
import type { Verzija } from "@/lib/types";

/** "Srednji nivo" → "srednji-nivo" (ključ kursa u adresama i API-ju) */
const uKljuc = (naziv: string) =>
  naziv
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

export default function SadrzajStrana() {
  const [kursevi, setKursevi] = useState<KursAdmin[] | null>(null);
  const [verzije, setVerzije] = useState<Verzija[] | null>(null);
  const [greska, setGreska] = useState("");
  const [nov, setNov] = useState({ naziv: "", kljuc: "", opis: "", preduslov: "" });
  const [rucnoKljuc, setRucnoKljuc] = useState(false);

  const ucitaj = useCallback(() => {
    api<KursAdmin[]>("/api/admin/kursevi").then(setKursevi).catch((e: Error) => setGreska(e.message));
    api<Verzija[]>("/api/admin/sadrzaj/verzije").then(setVerzije).catch((e: Error) => setGreska(e.message));
  }, []);
  useEffect(ucitaj, [ucitaj]);

  async function izmeni(kljuc: string, polja: Partial<{ aktivan: boolean; preduslov: string; redosled: number }>) {
    setGreska("");
    try {
      await posalji(`/api/admin/kursevi/${kljuc}`, "PATCH", polja);
      ucitaj();
    } catch (e) {
      setGreska((e as Error).message);
    }
  }

  async function napravi(e: React.FormEvent) {
    e.preventDefault();
    setGreska("");
    try {
      const k = await posalji<KursAdmin>("/api/admin/kursevi", "POST", {
        kljuc: nov.kljuc,
        naziv: nov.naziv.trim(),
        opis: nov.opis.trim() || null,
        preduslov: nov.preduslov || null,
      });
      window.location.href = `/admin/sadrzaj/uredi?kurs=${k.kljuc}`;
    } catch (err) {
      setGreska((err as Error).message);
    }
  }

  return (
    <>
      <div className="adm-glava">
        <div>
          <h1 className="h1">Sadržaj</h1>
        </div>
      </div>
      <p className="sub" style={{ marginBottom: 16 }}>
        Polaznici vide izmene tek kad ih objaviš.
      </p>
      {greska && <p className="note bad">{greska}</p>}

      <h2 className="sec-adm">Kursevi</h2>
      {kursevi && (
        <table className="tabela" style={{ marginBottom: 18 }}>
          <thead>
            <tr>
              <th>Kurs</th>
              <th>Stanje</th>
              <th>Nivoa</th>
              <th>Otključava se posle</th>
              <th>Redosled</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {kursevi.map((k, i) => (
              <tr key={k.kljuc}>
                <td>
                  <b>{k.naziv}</b>
                  <div className="mono">{k.kljuc}</div>
                </td>
                <td>
                  {k.verzija === null ? (
                    <span className="znak znak-pozvan">Nije objavljen</span>
                  ) : k.aktivan ? (
                    <span className="znak znak-aktivan">Objavljen v{k.verzija}</span>
                  ) : (
                    <span className="znak znak-iskljucen">Sakriven</span>
                  )}
                  {k.nacrt && k.verzija !== null && <span className="znak" style={{ marginLeft: 6 }}>Nacrt</span>}
                </td>
                <td>{k.nivoa}</td>
                <td>
                  <select
                    className="inp"
                    value={k.preduslov ?? ""}
                    onChange={(e) => izmeni(k.kljuc, { preduslov: e.target.value })}
                    aria-label={`Preduslov za ${k.naziv}`}
                  >
                    <option value="">Odmah dostupan</option>
                    {kursevi
                      .filter((x) => x.kljuc !== k.kljuc)
                      .map((x) => (
                        <option key={x.kljuc} value={x.kljuc}>
                          Položen test: {x.naziv}
                        </option>
                      ))}
                  </select>
                </td>
                <td>
                  <span className="akcije" style={{ justifyContent: "flex-start" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={i === 0}
                      aria-label="Gore"
                      onClick={() => {
                        izmeni(k.kljuc, { redosled: kursevi[i - 1].redosled });
                        izmeni(kursevi[i - 1].kljuc, { redosled: k.redosled });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={i === kursevi.length - 1}
                      aria-label="Dole"
                      onClick={() => {
                        izmeni(k.kljuc, { redosled: kursevi[i + 1].redosled });
                        izmeni(kursevi[i + 1].kljuc, { redosled: k.redosled });
                      }}
                    >
                      ↓
                    </button>
                  </span>
                </td>
                <td>
                  <div className="akcije">
                    <Link href={`/admin/sadrzaj/uredi?kurs=${k.kljuc}`} className="btn btn-gold">
                      Uredi
                    </Link>
                    {k.verzija !== null && (
                      <button type="button" className="btn btn-ghost" onClick={() => izmeni(k.kljuc, { aktivan: !k.aktivan })}>
                        {k.aktivan ? "Sakrij" : "Prikaži"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form className="forma" onSubmit={napravi}>
        <label>
          Nov kurs
          <input
            className="inp"
            value={nov.naziv}
            placeholder="npr. Meni Kafeterije"
            onChange={(e) => {
              const naziv = e.target.value;
              setNov((n) => ({ ...n, naziv, kljuc: rucnoKljuc ? n.kljuc : uKljuc(naziv) }));
            }}
          />
        </label>
        <label>
          Ključ (u adresi)
          <input
            className="inp mono"
            value={nov.kljuc}
            onChange={(e) => {
              setRucnoKljuc(true);
              setNov((n) => ({ ...n, kljuc: uKljuc(e.target.value) }));
            }}
          />
        </label>
        <label>
          Opis
          <input className="inp" value={nov.opis} onChange={(e) => setNov((n) => ({ ...n, opis: e.target.value }))} />
        </label>
        <label>
          Otključava se posle
          <select className="inp" value={nov.preduslov} onChange={(e) => setNov((n) => ({ ...n, preduslov: e.target.value }))}>
            <option value="">Odmah dostupan</option>
            {kursevi?.map((x) => (
              <option key={x.kljuc} value={x.kljuc}>
                Položen test: {x.naziv}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn" disabled={nov.naziv.trim().length < 3 || nov.kljuc.length < 2}>
          + Napravi kurs
        </button>
      </form>
      <p className="sub" style={{ marginBottom: 22 }}>
        Polaznici vide nov kurs tek kad ga objaviš.
      </p>

      <h2 className="sec-adm">Verzije</h2>
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
