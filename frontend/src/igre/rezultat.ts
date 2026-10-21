import { posalji } from "@/lib/api";
import type { RezultatZaServer } from "./ugovor";

export type RezultatOut = {
  zrna: number;
  ukupno_zrna: number;
  novi_bedzevi: string[];
  zvezdice: number;
  /** poeni za Brzu rundu, procenat za ostale */
  najbolje: number;
  rekord: boolean;
};

/** Isti poziv za JS i Unity verziju (backend/modules/igre). */
export const posaljiRezultat = (kurs: string, r: RezultatZaServer, kontekst: "igraonica" | "lekcija") =>
  posalji<RezultatOut>(`/api/igre/${kurs}/rezultat`, "POST", { ...r, kontekst });
