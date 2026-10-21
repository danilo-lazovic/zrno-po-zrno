/** Nedeljna rang lista po lokalu (backend/modules/rang). */

import { api } from "./api";

export type RedRanga = { korisnik_id: number; ime: string; avatar: string | null; zrna: number; mesto: number; ja: boolean };

export type Rang = { lokal: string | null; pocetak: string; kraj: string; redovi: RedRanga[]; polaznika: number };
export type RangLokala = Rang & { lokal_id: number };

/** pomak 0: ova nedelja, -1: prošla */
export const ucitajRang = (kurs: string, pomak = 0) => api<Rang>(`/api/rang/${kurs}?pomak=${pomak}`);

export const ucitajRangOsoblje = (kurs: string, pomak: number, lokal?: number) =>
  api<RangLokala[]>(`/api/admin/rang/${kurs}?pomak=${pomak}${lokal ? `&lokal_id=${lokal}` : ""}`);

/** 19.10. – 25.10. */
export function opsegNedelje(r: Pick<Rang, "pocetak" | "kraj">) {
  const f = (d: string) => `${Number(d.slice(8, 10))}.${Number(d.slice(5, 7))}.`;
  return `${f(r.pocetak)} – ${f(r.kraj)}`;
}
