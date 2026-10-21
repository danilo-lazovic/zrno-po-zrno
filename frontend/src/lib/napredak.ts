/** Napredak polaznika sa servera (backend/modules/napredak). */

import { posalji } from "./api";

export type Napredak = {
  zrna: number;
  danas_zrna: number;
  niz_dana: number;
  najduzi_niz: number;
  nivoi: Record<string, { zavrsen: boolean; zvezdice: number; najbolje: number }>;
  bedzevi: string[];
  kartice: Record<string, boolean>;
  /** najbolje: poeni za Brzu rundu, procenat za ostale */
  igre: Record<string, { najbolje: number; zvezdice: number; igranja: number }>;
  test: { najbolje: number; polozen: boolean };
};

export type OdgovorOut = { zrna: number; niz: number; ukupno_zrna: number; novi_bedzevi: string[] };

export type ZavrsetakOut = {
  tacnost: number;
  zvezdice: number;
  bonus: number;
  zrna_prolaz: number;
  ukupno_zrna: number;
  niz_dana: number;
  novi_bedzevi: string[];
};

export type KarticaOut = { zrna: number; ukupno_zrna: number; novi_bedzevi: string[] };

/** Šta se promenilo posle akcije: novi zbir zrna i bedževi, za obaveštenja i gornju traku. */
export type Dobitak = { ukupno_zrna: number; novi_bedzevi: string[] };

export const zapocniNivo = (kurs: string, nivo: string) =>
  posalji<{ prolaz_id: number }>(`/api/napredak/${kurs}/nivoi/${nivo}/prolaz`, "POST");

export const posaljiOdgovor = (prolaz: number, pitanje: string, rezultat: number, vreme_ms: number, izbor?: number | boolean) =>
  posalji<OdgovorOut>(`/api/napredak/prolazi/${prolaz}/odgovor`, "POST", { pitanje, rezultat, vreme_ms, izbor });

export const zavrsiNivo = (prolaz: number) => posalji<ZavrsetakOut>(`/api/napredak/prolazi/${prolaz}/zavrsi`, "POST");

export const oznaciKarticu = (kurs: string, pojam: string, zna: boolean) =>
  posalji<KarticaOut>(`/api/napredak/${kurs}/kartice/${encodeURIComponent(pojam)}`, "POST", { zna });

/** Isto pravilo kao na serveru (bodovanje.zrna_za_odgovor), samo za trenutni prikaz pre odgovora servera. */
export function procenaZrna(rezultat: number, nizPre: number): { zrna: number; niz: number } {
  if (rezultat >= 0.99) {
    const niz = nizPre + 1;
    return { zrna: Math.round(10 * rezultat) + (niz >= 3 ? Math.min(10, (niz - 2) * 2) : 0), niz };
  }
  return { zrna: Math.round(10 * rezultat), niz: 0 };
}
