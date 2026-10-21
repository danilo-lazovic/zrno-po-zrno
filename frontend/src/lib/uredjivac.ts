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
  /** nivoi iz objavljene verzije: ne brišu se i ne premeštaju */
  objavljeni_nivoi: string[];
};

export type NivoUredjivanje = Kurs["nivoi"][number] & { pool: Korak[] };
export type KursUredjivanje = Omit<Kurs, "nivoi"> & { nivoi: NivoUredjivanje[] };

const url = (kurs: string) => `/api/admin/sadrzaj/${encodeURIComponent(kurs)}/nacrt`;
export const ucitajNacrt = (kurs: string) => api<NacrtOut>(url(kurs));
export const sacuvajNacrt = (kurs: string, dokument: KursUredjivanje, revizija: number) =>
  api<NacrtOut>(url(kurs), { method: "PUT", body: JSON.stringify({ dokument, revizija }) });
export const odbaciNacrt = (kurs: string) => api<void>(url(kurs), { method: "DELETE" });
export const objaviNacrt = (kurs: string, napomena: string) =>
  posalji<{ verzija: number; izmena: number }>(`${url(kurs)}/objavi`, "POST", { napomena });

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

/** Nov nivo na kraju kursa; id m1, m2... nikad ne ponavlja obrisan. */
export function novNivo(dok: KursUredjivanje, zauzeti: Set<string>): NivoUredjivanje {
  let max = 0;
  for (const id of [...zauzeti, ...dok.nivoi.map((n) => n.id)]) {
    const m = id.match(/^m(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const n = dok.nivoi.length + 1;
  return { id: `m${max + 1}`, n, title: `Nivo ${n}`, icon: "bean", color: "#7B4A2D", min: 5, desc: "", steps: [], pool: [], swipe: [] };
}

/** Posle dodavanja, brisanja ili premeštanja nivoa: redni brojevi i delovi prate redosled nivoa, prazni delovi nestaju. */
export function srediNivoe(d: KursUredjivanje, deoNivoa: Record<string, number> = {}): KursUredjivanje {
  const nivoi = d.nivoi.map((n, i) => ({ ...n, n: i + 1 }));
  const clan: Record<string, number> = {};
  d.delovi.forEach((deo, i) => deo.nivoi.forEach((id) => (clan[id] = i)));
  Object.assign(clan, deoNivoa);
  const delovi = d.delovi.map((deo) => ({ ...deo, nivoi: [] as string[] }));
  for (const n of nivoi) {
    // nov nivo bez dela ide u poslednji deo
    const i = clan[n.id] ?? Math.max(0, delovi.length - 1);
    if (!delovi[i]) delovi[i] = { naziv: `Deo ${i + 1}`, nivoi: [] };
    delovi[i].nivoi.push(n.id);
  }
  return { ...d, nivoi, delovi: delovi.filter((x) => x && x.nivoi.length) };
}

export function opisKoraka(k: Korak): string {
  return String(k.q || k.title || "(bez teksta)");
}
