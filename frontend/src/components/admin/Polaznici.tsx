"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, posalji } from "@/lib/api";
import { datumVreme } from "@/lib/format";
import type { Lokal, Polaznik, PozivnicaOut, StatusPolaznika } from "@/lib/types";

const STATUS: Record<StatusPolaznika, string> = {
  pozvan: "Čeka PIN",
  aktivan: "Aktivan",
  zakljucan: "Zaključan",
  iskljucen: "Isključen",
};

export function Polaznici() {
  const [lokali, setLokali] = useState<Lokal[]>([]);
  const [polaznici, setPolaznici] = useState<Polaznik[] | null>(null);
  const [filter, setFilter] = useState("");
  const [greska, setGreska] = useState("");
  const [pozivnica, setPozivnica] = useState<PozivnicaOut | null>(null);
  const [forma, setForma] = useState({ ime: "", prezime: "", lokal_id: "" });

  const ucitaj = useCallback(() => {
    api<Polaznik[]>(`/api/admin/polaznici${filter ? `?lokal_id=${filter}` : ""}`)
      .then(setPolaznici)
      .catch((e: Error) => setGreska(e.message));
  }, [filter]);

  useEffect(() => {
    api<Lokal[]>("/api/admin/lokali")
      .then((l) => {
        const aktivni = l.filter((x) => x.aktivan);
        setLokali(aktivni);
        if (aktivni.length === 1) setForma((f) => ({ ...f, lokal_id: String(aktivni[0].id) }));
      })
      .catch((e: Error) => setGreska(e.message));
  }, []);
  useEffect(ucitaj, [ucitaj]);

  async function dodaj(e: React.FormEvent) {
    e.preventDefault();
    setGreska("");
    try {
      const p = await posalji<PozivnicaOut>("/api/admin/polaznici", "POST", { ...forma, lokal_id: Number(forma.lokal_id) });
      setPozivnica(p);
      setForma((f) => ({ ...f, ime: "", prezime: "" }));
      ucitaj();
    } catch (err) {
      setGreska((err as Error).message);
    }
  }

  async function novaPozivnica(p: Polaznik) {
    const poruka =
      p.status === "pozvan"
        ? `Napraviti novi link za ${p.ime} ${p.prezime}? Stari link prestaje da važi.`
        : `Napraviti novi link za ${p.ime} ${p.prezime}? Stari PIN se briše i polaznik se odjavljuje sa svih telefona dok ne postavi novi.`;
    if (!window.confirm(poruka)) return;
    try {
      setPozivnica(await posalji<PozivnicaOut>(`/api/admin/polaznici/${p.id}/pozivnica`, "POST"));
      ucitaj();
    } catch (err) {
      setGreska((err as Error).message);
    }
  }

  async function ukljuci(p: Polaznik, aktivan: boolean) {
    if (!aktivan && !window.confirm(`Isključiti ${p.ime} ${p.prezime}? Neće moći da se prijavi; napredak ostaje.`)) return;
    try {
      await posalji(`/api/admin/polaznici/${p.id}`, "PATCH", { aktivan });
      ucitaj();
    } catch (err) {
      setGreska((err as Error).message);
    }
  }

  return (
    <>
      <div className="adm-glava">
        <div>
          <h1 className="h1">Polaznici</h1>
        </div>
        {lokali.length > 1 && (
          <select className="inp" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Lokal">
            <option value="">Svi lokali</option>
            {lokali.map((l) => (
              <option key={l.id} value={l.id}>
                {l.naziv}
              </option>
            ))}
          </select>
        )}
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
        <button type="submit" className="btn btn-gold">
          Dodaj i napravi link
        </button>
        {greska && (
          <p className="greska" role="alert">
            {greska}
          </p>
        )}
      </form>

      {pozivnica && <LinkKartica pozivnica={pozivnica} zatvori={() => setPozivnica(null)} />}

      {polaznici === null ? (
        <p className="sub">Učitavam…</p>
      ) : polaznici.length === 0 ? (
        <div className="prazno">Još nema polaznika. Dodaj prvog iznad i pošalji mu link.</div>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Ime</th>
              <th>Korisničko ime</th>
              <th>Lokal</th>
              <th>Status</th>
              <th>Nivoa</th>
              <th>Zrna</th>
              <th>Test</th>
              <th>Poslednja aktivnost</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {polaznici.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/polaznici/${p.id}`}>
                    {p.ime} {p.prezime}
                  </Link>
                </td>
                <td className="mono">{p.korisnicko_ime}</td>
                <td>{p.lokal?.naziv ?? "–"}</td>
                <td>
                  <span className={`znak znak-${p.status}`}>{STATUS[p.status]}</span>
                </td>
                <td className="mono">{p.nivoa}/8</td>
                <td className="mono">{p.zrna}</td>
                <td>
                  {p.test_najbolje === null ? (
                    "–"
                  ) : (
                    <span className={`znak znak-${p.test_polozen ? "aktivan" : "pozvan"}`}>
                      {p.test_najbolje}% {p.test_polozen ? "položen" : "nije položen"}
                    </span>
                  )}
                </td>
                <td className="mono">{datumVreme(p.poslednja_aktivnost ?? p.poslednja_prijava)}</td>
                <td>
                  <div className="akcije">
                    {p.status !== "iskljucen" && (
                      <button type="button" className="btn" onClick={() => novaPozivnica(p)}>
                        Novi link
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost" onClick={() => ukljuci(p, p.status === "iskljucen")}>
                      {p.status === "iskljucen" ? "Uključi" : "Isključi"}
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

function LinkKartica({ pozivnica, zatvori }: { pozivnica: PozivnicaOut; zatvori: () => void }) {
  const [kopirano, setKopirano] = useState(false);
  const p = pozivnica.polaznik;
  const poruka = `Zdravo ${p.ime}! Ovo je tvoj link za Zrno po zrno, obuku za baristu: ${pozivnica.link}\nTvoje korisničko ime je ${p.korisnicko_ime}. Link važi do ${datumVreme(pozivnica.istice_u)}.`;

  async function kopiraj() {
    try {
      await navigator.clipboard.writeText(poruka);
      setKopirano(true);
    } catch {
      window.prompt("Kopiraj poruku:", poruka);
    }
  }

  return (
    <div className="card link-kartica" role="status">
      <p className="eyebrow">Link za {p.ime} {p.prezime}</p>
      <p className="sub">
        Pošalji ga polazniku (Viber, WhatsApp). Važi jednom, do {datumVreme(pozivnica.istice_u)}. Link se ne čuva i ne može
        ponovo da se prikaže; ako se izgubi, napravi novi.
      </p>
      <code>{pozivnica.link}</code>
      <div className="akcije">
        <button type="button" className="btn btn-gold" onClick={kopiraj}>
          {kopirano ? "Kopirano" : "Kopiraj poruku sa linkom"}
        </button>
        <a className="btn" href={`viber://forward?text=${encodeURIComponent(poruka)}`}>
          Viber
        </a>
        <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(poruka)}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <button type="button" className="btn btn-ghost" onClick={zatvori}>
          Zatvori
        </button>
      </div>
    </div>
  );
}
