"use client";

import { useState } from "react";
import { otpremiSliku } from "@/lib/uredjivac";

/** Male kontrole za formu uređivača. Svaka menja vrednost odmah; čuvanje je dugme na vrhu. */

export function Tekst({
  naziv,
  vrednost,
  promeni,
  vise,
  pomoc,
}: {
  naziv: string;
  vrednost: unknown;
  promeni: (v: string) => void;
  vise?: boolean;
  pomoc?: string;
}) {
  const v = typeof vrednost === "string" ? vrednost : "";
  return (
    <label className="ur-polje">
      <span>{naziv}</span>
      {vise ? (
        <textarea className="inp" rows={4} value={v} onChange={(e) => promeni(e.target.value)} />
      ) : (
        <input className="inp" value={v} onChange={(e) => promeni(e.target.value)} />
      )}
      {pomoc && <small>{pomoc}</small>}
    </label>
  );
}

export function Broj({ naziv, vrednost, promeni, korak }: { naziv: string; vrednost: unknown; promeni: (v: number) => void; korak?: number }) {
  return (
    <label className="ur-polje ur-kratko">
      <span>{naziv}</span>
      <input
        className="inp mono"
        type="number"
        step={korak ?? "any"}
        value={typeof vrednost === "number" ? vrednost : ""}
        onChange={(e) => promeni(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

/** Lista redova (ponuđeni odgovori, stavke, parovi) sa dodavanjem, brisanjem i pomeranjem. */
export function Lista<T>({
  naziv,
  stavke,
  promeni,
  nova,
  red,
  min = 2,
  max = 20,
  pomeranje = false,
}: {
  naziv: string;
  stavke: T[];
  promeni: (s: T[]) => void;
  nova: () => T;
  red: (s: T, menjaj: (v: T) => void, i: number) => React.ReactNode;
  min?: number;
  max?: number;
  pomeranje?: boolean;
}) {
  const zameni = (i: number, j: number) => {
    const s = [...stavke];
    [s[i], s[j]] = [s[j], s[i]];
    promeni(s);
  };
  return (
    <div className="ur-polje">
      <span>{naziv}</span>
      <ol className="ur-lista">
        {stavke.map((s, i) => (
          <li key={i}>
            <div className="ur-red">{red(s, (v) => promeni(stavke.map((x, k) => (k === i ? v : x))), i)}</div>
            <div className="ur-dugmici">
              {pomeranje && (
                <>
                  <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={() => zameni(i, i - 1)} aria-label="Gore">
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={i === stavke.length - 1}
                    onClick={() => zameni(i, i + 1)}
                    aria-label="Dole"
                  >
                    ↓
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                disabled={stavke.length <= min}
                onClick={() => promeni(stavke.filter((_, k) => k !== i))}
                aria-label="Obriši red"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn" disabled={stavke.length >= max} onClick={() => promeni([...stavke, nova()])}>
        + Dodaj
      </button>
    </div>
  );
}

/** Slika za karticu priče: postojeća iz /img, ili otpremljena (/api/slike/...). */
export function Slika({ vrednost, promeni }: { vrednost: unknown; promeni: (v: string | undefined) => void }) {
  const [salje, setSalje] = useState(false);
  const [greska, setGreska] = useState("");
  const putanja = typeof vrednost === "string" ? vrednost : "";
  const src = putanja && !putanja.startsWith("/") ? `/${putanja}` : putanja;

  async function izaberi(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setGreska("");
    setSalje(true);
    try {
      promeni(await otpremiSliku(f));
    } catch (err) {
      setGreska((err as Error).message);
    } finally {
      setSalje(false);
    }
  }

  return (
    <div className="ur-polje">
      <span>Slika</span>
      <div className="ur-slika">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" /> : <div className="ur-bez-slike">bez slike</div>}
        <div className="ur-slika-akcije">
          <label className="btn">
            {salje ? "Otpremam…" : "Otpremi sliku"}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={izaberi} disabled={salje} />
          </label>
          {putanja && (
            <button type="button" className="btn btn-ghost" onClick={() => promeni(undefined)}>
              Ukloni
            </button>
          )}
          <small className="mono">{putanja || "JPG, PNG ili WebP do 5 MB"}</small>
          {greska && <small className="ur-greska">{greska}</small>}
        </div>
      </div>
    </div>
  );
}
