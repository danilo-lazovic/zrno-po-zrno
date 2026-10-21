/**
 * Red za slanje: ono što polaznik uradi bez mreže (nivo, igra, kartica) čeka na telefonu i šalje se
 * redom čim se veza vrati. Čuva se u localStorage, posebno za svakog korisnika.
 */

import type { RezultatOut } from "@/igre/rezultat";
import type { RezultatZaServer } from "@/igre/ugovor";
import { BezMreze, GreskaServera, posalji } from "./api";
import type { Dobitak, KarticaOut, ZavrsetakOut } from "./napredak";

export type OdgovorURedu = { pitanje: string; rezultat: number; vreme_ms: number; izbor?: number | boolean };

export type Stavka =
  | {
      tip: "nivo";
      kljuc: string;
      kurs: string;
      nivo: string;
      /** prolaz započet sa mrežom pre nego što je veza pukla */
      prolaz_id?: number;
      odgovori: OdgovorURedu[];
      zavrseno_u: string;
      /** procena sa telefona, za prikaz pre slanja */
      zvezdice: number;
    }
  | { tip: "igra"; kljuc: string; kurs: string; rezultat: RezultatZaServer; kontekst: "igraonica" | "lekcija" }
  | { tip: "kartica"; kljuc: string; kurs: string; pojam: string; zna: boolean };

/** Ishod slanja reda; Polaznik ga dobija kao događaj i osvežava zrna, bedževe i napredak. */
export type Poslato = { poslato: number; odbijeno: number; dobitak: Dobitak | null };

export const DOGADJAJ_PROMENA = "zpz-red";
export const DOGADJAJ_POSLATO = "zpz-red-poslato";

let korisnik = 0;
export function postaviKorisnika(id: number) {
  korisnik = id;
}

const kljucSkladista = () => `zpz-red-${korisnik}`;

export function citajRed(): Stavka[] {
  try {
    return JSON.parse(localStorage.getItem(kljucSkladista()) ?? "[]");
  } catch {
    return [];
  }
}

function pisi(red: Stavka[]) {
  try {
    if (red.length) localStorage.setItem(kljucSkladista(), JSON.stringify(red));
    else localStorage.removeItem(kljucSkladista());
  } catch {
    /* bez skladišta: stavka se gubi, kao i bez reda */
  }
  window.dispatchEvent(new Event(DOGADJAJ_PROMENA));
}

export function noviKljuc(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // stariji pregledači i http bez localhosta
  const h = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20)}`;
}

export function dodajURed(s: Stavka) {
  pisi([...citajRed(), s]);
  posaljiRed();
}

function posaljiStavku(s: Stavka): Promise<Dobitak> {
  switch (s.tip) {
    case "nivo":
      return posalji<ZavrsetakOut>(`/api/napredak/${s.kurs}/nivoi/${s.nivo}/sinhronizacija`, "POST", {
        kljuc: s.kljuc,
        prolaz_id: s.prolaz_id,
        odgovori: s.odgovori,
        zavrseno_u: s.zavrseno_u,
      });
    case "igra":
      return posalji<RezultatOut>(`/api/igre/${s.kurs}/rezultat`, "POST", { ...s.rezultat, kontekst: s.kontekst });
    case "kartica":
      return posalji<KarticaOut>(`/api/napredak/${s.kurs}/kartice/${encodeURIComponent(s.pojam)}`, "POST", { zna: s.zna });
  }
}

let uToku: Promise<Poslato> | null = null;

/** Šalje red redom (nivo 2 posle nivoa 1). Staje kod prve stavke bez mreže; stavku koju server odbije izbacuje. */
export function posaljiRed(): Promise<Poslato> {
  uToku ??= (async () => {
    const out: Poslato = { poslato: 0, odbijeno: 0, dobitak: null };
    const bedzevi: string[] = [];
    for (;;) {
      const s = citajRed()[0];
      if (!s) break;
      try {
        const d = await posaljiStavku(s);
        bedzevi.push(...d.novi_bedzevi);
        out.dobitak = { ukupno_zrna: d.ukupno_zrna, novi_bedzevi: bedzevi };
        out.poslato++;
      } catch (e) {
        if (e instanceof BezMreze || (e instanceof GreskaServera && (e.status === 401 || e.status >= 500))) break;
        // npr. pitanje izbačeno iz sadržaja ili nivo zaključan: ponavljanje ne bi pomoglo
        out.odbijeno++;
      }
      pisi(citajRed().filter((x) => x.kljuc !== s.kljuc));
    }
    if (out.poslato || out.odbijeno) window.dispatchEvent(new CustomEvent<Poslato>(DOGADJAJ_POSLATO, { detail: out }));
    return out;
  })().finally(() => {
    uToku = null;
  });
  return uToku;
}
