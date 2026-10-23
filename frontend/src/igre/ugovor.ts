/**
 * Ugovor igre (odluka 20.10.2026, PROJECT_CONTEXT "Igre i Unity").
 *
 * Svaka igra, bila JS (canvas iz artifacta) ili Unity WebGL, dobija isti ulaz i vraća isti izlaz.
 * Igra ne zove API sama: vrati rezultat, a aplikacija ga šalje backendu i dodeljuje zrna i bedževe.
 * Tako Unity verzija može da zameni JS verziju bez izmene ostatka sistema.
 */

export type IgraId = "swipe" | "dialin" | "recipe" | "milk" | "latte" | "smena";

export type Implementacija = "js" | "unity";

export type UlazIgre = {
  igra_id: IgraId;
  /** konfiguracija nivoa iz sadržaja kursa (npr. pitanja za Brzu rundu, recepti, scenariji mlina) */
  konfiguracija: Record<string, unknown>;
  podesavanja: {
    zvuk: boolean;
    smanjeno_kretanje: boolean;
  };
};

export type RezultatIgre = {
  igra_id: IgraId;
  /** 0–1 */
  rezultat: number;
  /** 0–3 */
  zvezdice: 0 | 1 | 2 | 3;
  poeni: number;
  trajanje_ms: number;
  /** slobodno po igri (npr. pogođeni šotovi, greške po receptu); backend ga čuva kao JSON */
  detalji: Record<string, unknown>;
};

/** Ono što aplikacija šalje backendu: rezultat + odakle je stigao, radi poređenja JS i Unity verzija. */
export type RezultatZaServer = RezultatIgre & { izvor: Implementacija };

/** Montirana igra; aplikacija je gasi kad polaznik izađe. */
export type InstancaIgre = { unisti(): void };

/** Isti potpis za JS igru i za Unity omotač (react-unity-webgl + JS bridge). */
export type PokreniIgru = (
  host: HTMLElement,
  ulaz: UlazIgre,
  gotovo: (rezultat: RezultatIgre) => void,
) => InstancaIgre;

/** Pragovi zvezdica iz artifacta (games.js starsFor), da JS i Unity računaju isto. */
export function zvezdiceZa(rezultat: number): RezultatIgre["zvezdice"] {
  return rezultat >= 0.9 ? 3 : rezultat >= 0.7 ? 2 : rezultat >= 0.4 ? 1 : 0;
}
