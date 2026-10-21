/**
 * Koja implementacija pokreće koju igru. Ostatak aplikacije zove samo `pokretac(igra, implementacija)` i dobija
 * funkciju po ugovoru (ugovor.ts), pa zamena JS verzije Unity verzijom ne dira lekcije ni igraonicu.
 */

import * as G from "@/lib/igre";
import { sfx } from "@/lib/jezgro";
import { type IgraId, type Implementacija, type PokreniIgru, zvezdiceZa } from "./ugovor";

/** Konfiguracija koju aplikacija daje igri (ulaz.konfiguracija). */
export type KonfiguracijaIgre = {
  /** lekcija: kraća verzija igre unutar nivoa; igraonica: puna */
  mod: "lekcija" | "igraonica";
  /** Brza runda: tvrdnje iz završenih nivoa */
  pitanja?: { id: string; q: string; a: boolean }[];
};

const JS_FUNKCIJA: Record<IgraId, string> = {
  swipe: "swipeGame",
  dialin: "dialin",
  recipe: "recipe",
  milk: "milk",
  latte: "latte",
};

type RezultatArtifacta = { score: number; stars?: number; points?: number; perfect?: number };

/** Igra iz artifacta (canvas, lib/igre.ts) iza ugovora. */
function jsIgra(id: IgraId): PokreniIgru {
  return (host, ulaz, gotovo) => {
    const pocetak = Date.now();
    const konf = ulaz.konfiguracija as KonfiguracijaIgre;
    sfx.on = ulaz.podesavanja.zvuk;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pokreni = (G as any)[JS_FUNKCIJA[id]];
    const inst = pokreni(host, {
      mode: konf.mod === "lekcija" ? "lesson" : "arcade",
      items: konf.pitanja?.map((p) => [p.q, p.a]) ?? null,
      onDone: (r: RezultatArtifacta) => {
        const rezultat = Math.max(0, Math.min(1, r.score));
        gotovo({
          igra_id: id,
          rezultat,
          zvezdice: zvezdiceZa(rezultat),
          poeni: id === "swipe" ? (r.points ?? 0) : Math.round(rezultat * 100),
          trajanje_ms: Date.now() - pocetak,
          detalji: r.perfect != null ? { perfect: r.perfect } : {},
        });
      },
    });
    return { unisti: () => inst.destroy() };
  };
}

/**
 * Unity WebGL igre: kad igra prođe proveru na telefonima (veličina builda, učitavanje, iOS Safari),
 * ovde se upisuje njen pokretač (react-unity-webgl + JS bridge koji na kraju zove `gotovo` sa istim rezultatom).
 * Dok igre nema u ovoj mapi, sadržaj sa `implementacija: "unity"` koristi JS verziju.
 */
const UNITY: Partial<Record<IgraId, PokreniIgru>> = {};

export function pokretac(igra: IgraId, implementacija: Implementacija = "js"): { pokreni: PokreniIgru; izvor: Implementacija } {
  const unity = implementacija === "unity" ? UNITY[igra] : undefined;
  return unity ? { pokreni: unity, izvor: "unity" } : { pokreni: jsIgra(igra), izvor: "js" };
}

/** Podešavanja za ulaz igre iz trenutnog stanja aplikacije. */
export function podesavanja() {
  let smanjeno = false;
  try {
    smanjeno = matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    /* stari pregledač */
  }
  return { zvuk: sfx.on as boolean, smanjeno_kretanje: smanjeno };
}
