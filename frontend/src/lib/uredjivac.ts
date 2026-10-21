/** Uređivač sadržaja (backend/modules/uredjivac). */

import { api, posalji } from "./api";
import type { Korak, Kurs } from "./sadrzaj";

export type Izmena = { id: string; opis: string; vrsta: "dodato" | "izmenjeno" | "obrisano" };

export type NacrtOut = {
  kurs: string;
  /** ceo kurs, uključujući banku pitanja (pool), koju polaznik nikad ne dobija */
  dokument: KursUredjivanje;
  /** 0: nacrt još nije sačuvan */
  revizija: number;
  osnova: number;
  izmenio: string | null;
  izmenjen_u: string | null;
  izmene: Izmena[];
  greske: string[];
  zauzeti_id: string[];
};

export type NivoUredjivanje = Kurs["nivoi"][number] & { pool: Korak[] };
export type KursUredjivanje = Omit<Kurs, "nivoi"> & { nivoi: NivoUredjivanje[] };

const URL = "/api/admin/sadrzaj/osnovni/nacrt";
export const ucitajNacrt = () => api<NacrtOut>(URL);
export const sacuvajNacrt = (dokument: KursUredjivanje, revizija: number) =>
  api<NacrtOut>(URL, { method: "PUT", body: JSON.stringify({ dokument, revizija }), headers: { "content-type": "application/json" } });
export const odbaciNacrt = () => api<void>(URL, { method: "DELETE" });
export const objaviNacrt = (napomena: string) => posalji<{ verzija: number; izmena: number }>(`${URL}/objavi`, "POST", { napomena });

export async function otpremiSliku(fajl: File): Promise<string> {
  const res = await fetch("/api/admin/sadrzaj/slike", { method: "POST", body: fajl, headers: { "content-type": fajl.type } });
  const telo = await res.json().catch(() => null);
  if (!res.ok) throw new Error(telo?.detail ?? `Greška ${res.status}`);
  return telo.url;
}

export const TIPOVI: Record<string, string> = {
  story: "Priča",
  mc: "Izbor odgovora",
  tf: "Tačno / netačno",
  num: "Klizač",
  order: "Ređanje",
  match: "Spajanje parova",
  sort: "Prevlačenje levo-desno",
  explore: "Istraži crtež",
  hotspot: "Tačke na crtežu",
  clip: "Klip",
  game: "Igra",
};

/** Tipovi koji se mogu dodati iz uređivača; crteži, klipovi i igre traže kod (art.ts, igre.ts). */
export const NOVI_TIPOVI = ["story", "mc", "tf", "num", "order", "match", "sort"];
export const TIPOVI_BANKE = ["mc", "tf", "num"];

/** Sledeći slobodan id u nivou: m3.k13, m3.b09, m3.s10. Obrisani id-jevi se ne koriste ponovo. */
export function noviId(nivo: string, slovo: "k" | "b" | "s", zauzeti: Set<string>): string {
  const re = new RegExp(`^${nivo}\\.${slovo}(\\d+)$`);
  let max = 0;
  for (const id of zauzeti) {
    const m = id.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${nivo}.${slovo}${String(max + 1).padStart(2, "0")}`;
}

export function noviIdPojma(pojam: string, zauzeti: Set<string>): string {
  const slug =
    pojam
      .toLowerCase()
      .replace(/đ/g, "dj")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "pojam";
  let id = `p.${slug}`;
  for (let i = 2; zauzeti.has(id); i++) id = `p.${slug}-${i}`;
  return id;
}

/** Šablon novog koraka; urednik ga popunjava. Prazna polja hvata provera pre objave. */
export function novKorak(t: string, id: string): Korak {
  switch (t) {
    case "story":
      return { id, t, title: "", text: "" };
    case "mc":
      return { id, t, q: "", opts: ["", ""], a: 0, why: "" };
    case "tf":
      return { id, t, q: "", a: true, why: "" };
    case "num":
      return { id, t, q: "", min: 0, max: 10, step: 1, unit: "", start: 0, a: [5, 5], why: "" };
    case "order":
      return { id, t, q: "", items: ["", ""], why: "" };
    case "match":
      return { id, t, q: "", pairs: [["", ""], ["", ""]], why: "" };
    default:
      return { id, t: "sort", q: "", left: "", right: "", items: [["", 0], ["", 1]], why: "" };
  }
}

export function opisKoraka(k: Korak): string {
  return String(k.q || k.title || "(bez teksta)");
}
