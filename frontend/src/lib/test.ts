/** Završni test i sertifikat (backend/modules/test). Tačne odgovore zna samo server. */

import { posalji } from "./api";

export type Sertifikat = { kod: string; procenat: number; izdat_u: string; opozvan: boolean };

export type TestStanje = {
  otkljucan: boolean;
  pitanja: number;
  prag: number;
  pokusaja: number;
  najbolje: number;
  polozen: boolean;
  sertifikat: Sertifikat | null;
};

/** Pitanje bez tačnog odgovora: mc (opts), tf ili num (min, max, step, unit, start). */
export type PitanjeTesta = {
  id: string;
  t: "mc" | "tf" | "num";
  q: string;
  opts?: string[];
  art?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  start?: number;
};

export type OdgovorTesta = { rezultat: number; resenje: number | boolean | [number, number]; zasto: string | null };

export type ZavrsetakTesta = {
  procenat: number;
  polozen: boolean;
  prag: number;
  slabi_nivoi: string[];
  sertifikat: Sertifikat | null;
  zrna: number;
  ukupno_zrna: number;
  novi_bedzevi: string[];
};

export const zapocniTest = (kurs: string) =>
  posalji<{ test_id: number; pitanja: PitanjeTesta[] }>(`/api/test/${kurs}/pokusaj`, "POST");

export const odgovoriNaTest = (test: number, pitanje: string, odgovor: number | boolean, vreme_ms: number) =>
  posalji<OdgovorTesta>(`/api/test/pokusaji/${test}/odgovor`, "POST", { pitanje, odgovor, vreme_ms });

export const zavrsiTest = (test: number) => posalji<ZavrsetakTesta>(`/api/test/pokusaji/${test}/zavrsi`, "POST");

const DATUM = new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: "Europe/Belgrade", day: "numeric", month: "numeric", year: "numeric" });
export const datum = (iso: string) => DATUM.format(new Date(iso));
