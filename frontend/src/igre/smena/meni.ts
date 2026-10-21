/**
 * Meni za igru "Smena u Kafeteriji". Dolazi iz sadržaja kursa (`meni` u dokumentu), pa ga trener menja
 * kao i ostalo gradivo; igra nudi samo pića čiji je nivo (`after`) polaznik završio.
 */

/** Koliko pene traži piće (debljina sloja u šolji). */
export type Pena = "tanka" | "srednja" | "gusta";

export type Pice = {
  id: string;
  naziv: string;
  /** otključava se posle ovog nivoa kursa */
  after: string;
  /** kratko, za kartu recepta */
  opis?: string;
  espreso: {
    /** grama mlevene kafe u portafilteru */
    doza: [number, number];
    /** grama espresa u šoljici */
    prinos: [number, number];
    /** sekundi od starta */
    vreme: [number, number];
  };
  /** id iz `solje` */
  solja: string;
  mleko?: {
    /** koliko mleka ide u latijeru */
    ml: [number, number];
    /** °C */
    temp: [number, number];
    pena: Pena;
  } | null;
};

export type Solja = {
  id: string;
  naziv: string;
  ml: number;
  /** masa prazne šolje na vagi */
  g: number;
  oblik: "soljica" | "solja" | "casa";
};

export type VrstaMleka = { id: string; naziv: string; boja: string };

export type Meni = {
  pica: Pice[];
  solje: Solja[];
  mleka: VrstaMleka[];
  /** napomena za trenera (npr. da je meni privremen) */
  napomena?: string;
};

export const PENA_NAZIV: Record<Pena, string> = { tanka: "tanka mikropena", srednja: "srednja pena", gusta: "gusta pena" };

/** Ciljni opseg "pene" iz modela mleka (0–1) za svaku debljinu. */
export const PENA_OPSEG: Record<Pena, [number, number]> = { tanka: [0.1, 0.24], srednja: [0.22, 0.4], gusta: [0.38, 0.6] };

export const opseg = ([a, b]: [number, number], jedinica = "") => (a === b ? `${a}${jedinica}` : `${a}–${b}${jedinica}`);

/** Pića koja polaznik može da dobije u smeni: samo iz završenih nivoa (bar prvo piće, da smena ne bude prazna). */
export function dostupnaPica(meni: Meni, zavrseni: string[]): Pice[] {
  const ok = meni.pica.filter((p) => zavrseni.includes(p.after) && meni.solje.some((s) => s.id === p.solja));
  return ok.length ? ok : meni.pica.slice(0, 1);
}

/** Recept kao redovi za kartu (ista karta u igri i na kraju smene). */
export function receptRedovi(p: Pice, meni: Meni): [string, string][] {
  const s = meni.solje.find((x) => x.id === p.solja);
  const r: [string, string][] = [
    ["Doza", opseg(p.espreso.doza, " g")],
    ["Espreso", `${opseg(p.espreso.prinos, " g")} za ${opseg(p.espreso.vreme, " s")}`],
    ["Šolja", s ? `${s.naziv} (${s.ml} ml)` : p.solja],
  ];
  if (p.mleko) {
    r.push(["Mleko", `${opseg(p.mleko.ml, " ml")} u latijeru`]);
    r.push(["Temperatura", opseg(p.mleko.temp, " °C")]);
    r.push(["Pena", PENA_NAZIV[p.mleko.pena]]);
  }
  return r;
}
