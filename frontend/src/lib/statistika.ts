/** Admin statistika (backend/modules/statistika). */

export type PolaznikKratko = {
  id: number;
  ime: string;
  prezime: string;
  lokal: string | null;
  nivoa: number;
  poslednja_aktivnost: string | null;
  dana_bez_aktivnosti: number | null;
};

export type Pregled = {
  polaznika: number;
  pozvanih: number;
  aktivnih_danas: number;
  aktivnih_7d: number;
  zavrsili_sve_nivoe: number;
  polozili_test: number;
  prosek_testa: number | null;
  levak: { kljuc: string; naziv: string; polaznika: number }[];
  aktivnost: { dan: string; polaznika: number; zrna: number }[];
  zapeli: PolaznikKratko[];
};

export type PitanjeStat = {
  kljuc: string;
  nivo: string;
  tip: string;
  tekst: string;
  odgovora: number;
  tacnost: number;
  najcesci_pogresan: string | null;
  pogresan_puta: number;
};

export type IgraStat = {
  igra: string;
  naziv: string;
  igranja: number;
  igraca: number;
  prosek: number;
  tri_zvezdice: number;
  iz_lekcija: number;
  unity: number;
};

export type LokalStat = {
  id: number;
  naziv: string;
  polaznika: number;
  aktivnih_7d: number;
  prosek_nivoa: number;
  polozili_test: number;
  prosek_testa: number | null;
};

export type Detalj = {
  id: number;
  ime: string;
  prezime: string;
  korisnicko_ime: string;
  lokal: string | null;
  zrna: number;
  nivoi: {
    nivo: string;
    naziv: string;
    zavrsen_u: string | null;
    zvezdice: number;
    najbolje: number;
    prolazaka: number;
    tacnost_odgovora: number | null;
  }[];
  testovi: { pocetak: string; kraj: string | null; procenat: number | null; polozen: boolean | null }[];
  sertifikat: string | null;
  bedzevi: string[];
  igre: Record<string, number>;
  najslabija_pitanja: PitanjeStat[];
  dogadjaji: { u: string; vrsta: string; opis: string }[];
};

export const TIP_PITANJA: Record<string, string> = {
  mc: "izbor",
  tf: "tačno/netačno",
  num: "klizač",
  order: "ređanje",
  match: "spajanje",
  sort: "prevlačenje",
  hotspot: "tačke",
  game: "igra",
  swipe: "brza runda",
};

const KRATAK_DAN = new Intl.DateTimeFormat("sr-Latn-RS", { day: "numeric", month: "numeric" });
export const kratakDan = (iso: string) => KRATAK_DAN.format(new Date(`${iso}T12:00:00`));

export const sa = (lokal: string) => (lokal ? `?lokal_id=${lokal}` : "");
