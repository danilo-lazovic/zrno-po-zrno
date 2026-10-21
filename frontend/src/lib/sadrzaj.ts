/** Dokument kursa kakav vraća GET /api/sadrzaj/{kurs} (format: backend/modules/sadrzaj/data/osnovni-nivo.json). */

export type Korak = {
  id: string;
  /** story, explore, clip, game, mc, tf, num, order, match, sort, hotspot */
  t: string;
  title?: string;
  text?: string;
  q?: string;
  remember?: string;
  [polje: string]: unknown;
};

export type Nivo = {
  id: string;
  n: number;
  title: string;
  icon: string;
  color: string;
  /** procena trajanja u minutima */
  min: number;
  desc: string;
  steps: Korak[];
  swipe: { id: string; q: string; a: boolean }[];
};

export type IgraOpis = {
  id: string;
  t: string;
  d: string;
  ic: string;
  /** otključava se posle ovog nivoa */
  after: string;
  color: string;
  implementacija: "js" | "unity";
};

export type Kurs = {
  kurs: { kljuc: string; naziv: string; opis?: string };
  podesavanja: { prag: number; test_pitanja: number; dnevni_cilj: number };
  delovi: { naziv: string; nivoi: string[] }[];
  rangovi: { min: number; naziv: string }[];
  bedzevi: { id: string; naziv: string; opis: string }[];
  nivoi: Nivo[];
  igre: IgraOpis[];
  pojmovi: { id: string; nivo: string; pojam: string; opis: string }[];
  recepti: unknown[];
  recept_polja: unknown[];
};

export type SadrzajOut = { kurs: string; verzija: number; dokument: Kurs };

export const IZAZOVI = ["mc", "tf", "num", "order", "match", "sort", "hotspot", "game"];

export function rangZa(kurs: Kurs, zrna: number) {
  let i = 0;
  kurs.rangovi.forEach((r, k) => {
    if (zrna >= r.min) i = k;
  });
  return { i, ...kurs.rangovi[i], sledeci: kurs.rangovi[i + 1] ?? null };
}

/** srpska množina: 1 zrno · 2 zrna · 5 zrna */
export function mnozina(n: number, jedan: string, malo: string, mnogo: string) {
  const a = Math.abs(n) % 100,
    b = a % 10;
  if (b === 1 && a !== 11) return jedan;
  if (b >= 2 && b <= 4 && (a < 12 || a > 14)) return malo;
  return mnogo;
}

/** **podebljano** u <b>, ostalo escapovano */
export function md(s: string) {
  const esc = s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return esc.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}
