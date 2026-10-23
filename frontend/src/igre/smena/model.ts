/**
 * Pravila smene bez crtanja: gosti, šot, mleko i ocena po stanicama. Scena (igra.ts) samo prikazuje stanje
 * i zove ove funkcije, pa se pravila mogu proveriti bez pregledača.
 */

import { type Meni, PENA_OPSEG, type Pice, type VrstaMleka } from "./meni";

// ---------- gosti ----------

export type Izgled = {
  koza: string;
  kosa: string;
  frizura: number;
  majica: string;
  naocare: boolean;
  kapa: boolean;
  brada: boolean;
};

export type Gost = {
  id: number;
  ime: string;
  izgled: Izgled;
  pice: Pice;
  /** vrsta mleka koju je tražio; null za piće bez mleka */
  mleko: VrstaMleka | null;
  /** sekunda smene kad ulazi */
  dolazak: number;
};

const IMENA = ["Ana", "Marko", "Jelena", "Nikola", "Mina", "Luka", "Sara", "Vuk", "Teodora", "Filip", "Milica", "Stefan", "Iva", "Đorđe", "Lena", "Pavle"];
const KOZA = ["#f6d7bf", "#eac09d", "#d9a27b", "#b97a53", "#8d5a3b"];
const KOSA = ["#171717", "#3b2516", "#6b4426", "#c98a3c", "#e6c27a", "#9a9a9a", "#b3362b"];
const MAJICE = ["#23a566", "#ffc935", "#dce4f5", "#cde8da", "#fbd5cf", "#171717", "#ffffff", "#d6589a"];

export type Rng = () => number;

/** Mulberry32: ista smena za isto seme (testovi). */
export function seme(s: number): Rng {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const izaberi = <T>(r: Rng, a: T[]): T => a[Math.floor(r() * a.length)];

export function noviIzgled(r: Rng): Izgled {
  return {
    koza: izaberi(r, KOZA),
    kosa: izaberi(r, KOSA),
    frizura: Math.floor(r() * 5),
    majica: izaberi(r, MAJICE),
    naocare: r() < 0.3,
    kapa: r() < 0.15,
    brada: r() < 0.2,
  };
}

/**
 * Gosti jedne smene. Prvi ulazi odmah, ostali na 35–55 s; svako piće iz menija dođe bar jednom ako ima mesta.
 * Vrstu mleka biraju samo pića sa mlekom; obično je prvo mleko u meniju, ostala dolaze ređe.
 */
export function gostiSmene(pica: Pice[], mleka: VrstaMleka[], broj: number, r: Rng): Gost[] {
  const redosled = [...pica].sort(() => r() - 0.5);
  const imena = [...IMENA].sort(() => r() - 0.5);
  const gosti: Gost[] = [];
  let t = 2;
  for (let i = 0; i < broj; i++) {
    const pice = i < redosled.length ? redosled[i] : izaberi(r, pica);
    const mleko = pice.mleko && mleka.length ? (r() < 0.65 || mleka.length === 1 ? mleka[0] : izaberi(r, mleka.slice(1))) : null;
    gosti.push({ id: i + 1, ime: imena[i % imena.length], izgled: noviIzgled(r), pice, mleko, dolazak: t });
    t += 35 + r() * 20;
  }
  return gosti;
}

// ---------- mlin i šot ----------

/** Do prvih kapi (predinfuzija); posle toga mlaz se dve sekunde zahuktava. */
export const KASNJENJE = 5;
export const ZALET = 2;
/** Pritisak tampera koji važi kao ravnomeran (kg). */
export const TAMP: [number, number] = [13, 20];
/** Mlin daje oko 2,4 g/s; posle puštanja dugmeta padne još malo kafe. */
export const MLIN_GS = 2.4;
export const MLIN_ZAOSTATAK = 0.3;

/**
 * Protok espresa (g/s) posle zaleta. Krupnije (veći broj) teče brže, sitnije sporije; veća doza malo
 * usporava; slab tamp pravi kanale i ubrzava. Pri idealnoj granulaciji 19 → 38 g traje oko 28 s.
 */
export function protok(doza: number, granulacija: number, idealna: number, tamp: number | null): number {
  const g = Math.pow(1.12, granulacija - idealna);
  const d = Math.pow(19 / Math.max(6, doza), 0.6);
  const t = tamp != null && tamp < TAMP[0] - 3 ? 1.25 : 1;
  return 1.75 * g * d * t;
}

/** Grama espresa u šoljici posle t sekundi ekstrakcije. */
export function prinosPosle(t: number, q: number): number {
  const u = t - KASNJENJE;
  if (u <= 0) return 0;
  if (u <= ZALET) return (q * u * u) / (2 * ZALET);
  return (q * ZALET) / 2 + q * (u - ZALET);
}

// ---------- mleko ----------

export type Mleko = {
  vrsta: string;
  ml: number;
  temp: number;
  /** vazduh u mleku (0–1) */
  pena: number;
  /** koliko su pena i mleko spojeni vrtlogom (0–1) */
  spojeno: number;
  /** krupni mehurići (0–1) */
  mehurici: number;
  pregorelo: boolean;
};

export const novoMleko = (vrsta: string): Mleko => ({ vrsta, ml: 0, temp: 5, pena: 0, spojeno: 0, mehurici: 0, pregorelo: false });

export type Vrh = "iznad" | "povrsina" | "duboko";

/** Položaj vrha stimera iz dubine (-1 iznad, +1 duboko), isti pragovi kao u igri Kralj pare. */
export const vrhZa = (dubina: number): Vrh => (dubina < -0.3 ? "iznad" : dubina <= 0.2 ? "povrsina" : "duboko");

export const PREGORELO = 75;

/** Jedan korak pare (pravila iz igre Kralj pare; manje mleka se brže greje). */
export function korakPare(m: Mleko, dubina: number, dt: number): void {
  const k = (a: number) => Math.max(0, Math.min(1, a));
  m.temp += 3.6 * Math.min(1.6, Math.max(0.6, Math.pow(180 / Math.max(60, m.ml), 0.6))) * dt;
  const vrh = vrhZa(dubina);
  if (vrh === "iznad") {
    m.mehurici = k(m.mehurici + 0.42 * dt);
    m.pena = k(m.pena + 0.1 * dt);
  } else if (vrh === "povrsina") {
    m.pena = k(m.pena + 0.12 * dt);
  } else {
    if (m.pena > 0.04) m.spojeno = k(m.spojeno + 0.17 * dt);
    m.mehurici = k(m.mehurici - 0.05 * dt);
  }
  if (m.temp >= PREGORELO) m.pregorelo = true;
}

// ---------- šank ----------

/** Zapremina espresa sa kremom (ml po gramu). */
export const ML_PO_G = 1.3;

/** Koliko ml u šolji daje mililitar mleka sa ovoliko pene. */
export const zapreminaMleka = (ml: number, pena: number) => ml * (1 + pena * 0.8);

// ---------- ocena ----------

export type Napitak = {
  doza: number;
  tamp: number | null;
  granulacija: number | null;
  solja: string | null;
  /** vaga tarirana sa šoljom, pre starta */
  tara: boolean;
  /** grama espresa i sekundi ekstrakcije (posle Stop) */
  sot: { g: number; s: number } | null;
  mleko: Mleko | null;
  /** ml mleka sipanog u šolju */
  sipano: number;
  /** latte art 0–1 (samo za pića sa mlekom) */
  art: number;
  recept: boolean;
};

export const noviNapitak = (): Napitak => ({
  doza: 0, tamp: null, granulacija: null, solja: null, tara: false, sot: null, mleko: null, sipano: 0, art: 0, recept: false,
});

export type Kategorija = "solja" | "doza" | "tamp" | "sot" | "procedura" | "mleko" | "sipanje" | "cekanje";

export const KATEGORIJE: { id: Kategorija; naziv: string; tezina: number }[] = [
  { id: "doza", naziv: "Doza", tezina: 1 },
  { id: "tamp", naziv: "Tamp", tezina: 0.5 },
  { id: "sot", naziv: "Šot", tezina: 2 },
  { id: "procedura", naziv: "Procedura", tezina: 0.5 },
  { id: "solja", naziv: "Šolja", tezina: 1 },
  { id: "mleko", naziv: "Mleko", tezina: 2 },
  { id: "sipanje", naziv: "Sipanje", tezina: 1 },
  { id: "cekanje", naziv: "Čekanje", tezina: 1 },
];

/** 1 unutar opsega, pa linearno do 0 na `pad` jedinica od opsega. */
export function uOpsegu(x: number, [a, b]: [number, number], pad: number): number {
  const d = x < a ? a - x : x > b ? x - b : 0;
  return Math.max(0, 1 - d / pad);
}

export type Ocena = {
  /** 0–1 */
  ukupno: number;
  kategorije: Partial<Record<Kategorija, number>>;
  /** šta je gost primetio, najgore prvo */
  primedbe: string[];
  napojnica: number;
  napamet: boolean;
};

/** Koliko gost čeka bez gunđanja (s od porudžbine): espreso je brz, mlečna pića traju duže. */
export const strpljenje = (p: Pice) => (p.mleko ? 150 : 95);

export function oceni(n: Napitak, gost: Gost, meni: Meni, cekao: number): Ocena {
  const p = gost.pice;
  const k: Partial<Record<Kategorija, number>> = {};
  const primedbe: [number, string][] = [];
  const zameri = (koliko: number, tekst: string) => koliko < 0.999 && primedbe.push([koliko, tekst]);

  const solja = meni.solje.find((s) => s.id === p.solja);
  k.solja = n.solja === p.solja ? 1 : 0;
  zameri(k.solja, `Pogrešna šolja: ${p.naziv} ide u ${solja ? solja.naziv.toLowerCase() : p.solja}.`);

  k.doza = uOpsegu(n.doza, p.espreso.doza, 2.5);
  zameri(k.doza, n.doza < p.espreso.doza[0] ? `Premalo kafe: ${fmt(n.doza)} g, recept traži ${p.espreso.doza.join("–")} g.` : `Previše kafe: ${fmt(n.doza)} g, recept traži ${p.espreso.doza.join("–")} g.`);

  k.tamp = n.tamp != null && n.tamp >= TAMP[0] && n.tamp <= TAMP[1] ? 1 : 0.4;
  zameri(k.tamp, n.tamp == null ? "Kafa nije tampovana." : n.tamp < TAMP[0] ? "Tamp je preslab: voda pravi kanale." : "Tamp je prejak.");

  if (n.sot) {
    const pr = uOpsegu(n.sot.g, p.espreso.prinos, 6);
    const vr = uOpsegu(n.sot.s, p.espreso.vreme, 6);
    k.sot = (pr + vr) / 2;
    if (vr < 0.999)
      zameri(vr, n.sot.s < p.espreso.vreme[0]
        ? `Šot je prebrz (${Math.round(n.sot.s)} s): kiselkast. Melji sitnije.`
        : `Šot je prespor (${Math.round(n.sot.s)} s): gorak. Melji krupnije.`);
    if (pr < 0.999)
      zameri(pr, n.sot.g < p.espreso.prinos[0]
        ? `Premalo espresa: ${fmt(n.sot.g)} g umesto ${p.espreso.prinos.join("–")} g.`
        : `Previše espresa: ${fmt(n.sot.g)} g umesto ${p.espreso.prinos.join("–")} g, razvodnjeno.`);
  } else {
    k.sot = 0;
    zameri(0, "Nema espresa.");
  }

  k.procedura = n.tara ? 1 : 0;
  zameri(k.procedura, "Vaga nije tarirana sa šoljom pre šota, pa prinos nije bio tačan.");

  let pogresnoMleko = false;
  if (p.mleko) {
    const m = n.mleko;
    if (!m || m.ml === 0) {
      k.mleko = 0;
      k.sipanje = 0;
      zameri(0, "Nema mleka u piću.");
    } else {
      pogresnoMleko = !!gost.mleko && m.vrsta !== gost.mleko.id;
      const temp = m.pregorelo ? 0 : uOpsegu(m.temp, p.mleko.temp, 10);
      const pena = uOpsegu(m.pena, PENA_OPSEG[p.mleko.pena], 0.25);
      const spojeno = Math.min(1, m.spojeno / 0.6);
      const mehurici = m.mehurici < 0.25 ? 1 : Math.max(0, 1 - (m.mehurici - 0.25) * 2);
      k.mleko = pogresnoMleko ? 0 : (temp + pena + spojeno + mehurici) / 4;
      if (pogresnoMleko) zameri(0, `Gost je tražio ${gost.mleko!.naziv.toLowerCase()} mleko!`);
      zameri(temp, m.pregorelo || m.temp > p.mleko.temp[1] ? `Mleko je prevruće (${Math.round(m.temp)} °C).` : `Mleko je prehladno (${Math.round(m.temp)} °C).`);
      zameri(pena, m.pena < PENA_OPSEG[p.mleko.pena][0] ? `Premalo pene za ${p.naziv.toLowerCase()}: drži vrh duže na površini.` : `Previše pene za ${p.naziv.toLowerCase()}: ranije potopi vrh.`);
      zameri(spojeno, "Pena i mleko nisu spojeni: duže vrtlog sa potopljenim vrhom.");
      zameri(mehurici, "Krupni mehurići: vrh stimera je bio iznad površine.");

      const cap = solja?.ml ?? 200;
      const puno = ((n.sot?.g ?? 0) * ML_PO_G + zapreminaMleka(n.sipano, m.pena)) / cap;
      const nivo = puno > 1.02 ? 0.3 : uOpsegu(puno, [0.85, 1.0], 0.4);
      k.sipanje = nivo * 0.7 + n.art * 0.3;
      zameri(nivo, puno > 1.02 ? "Prelilo se preko ivice." : "Šolja nije puna.");
    }
  }

  const sp = strpljenje(p);
  k.cekanje = uOpsegu(cekao, [0, sp], 120);
  zameri(k.cekanje, `Gost je čekao ${Math.round(cekao)} s.`);

  let zbir = 0;
  let tezine = 0;
  for (const c of KATEGORIJE) {
    const v = k[c.id];
    if (v == null) continue;
    zbir += v * c.tezina;
    tezine += c.tezina;
  }
  // jedan loš korak kvari piće: prosek se umanjuje prema najslabijoj stanici (kiseo šot nije "savršen" ni uz dobro mleko)
  const najslabije = Math.min(...Object.values(k));
  let ukupno = tezine ? (zbir / tezine) * (0.6 + 0.4 * najslabije) : 0;
  // pogrešno mleko (alergija, intolerancija) obara celu porudžbinu
  if (pogresnoMleko) ukupno = Math.min(ukupno, 0.3);
  const napamet = !n.recept && ukupno >= 0.8;
  const napojnica = Math.round((Math.pow(ukupno, 1.5) * 200) / 10) * 10 + (napamet ? 20 : 0);
  return {
    ukupno,
    kategorije: k,
    primedbe: primedbe.sort((a, b) => a[0] - b[0]).map((x) => x[1]),
    napojnica,
    napamet,
  };
}

const fmt = (x: number) => x.toFixed(1).replace(".", ",");

/** Proseci po kategorijama za kraj smene i za statistiku (detalji rezultata). */
export function sazetak(ocene: Ocena[]): Partial<Record<Kategorija, number>> {
  const out: Partial<Record<Kategorija, number>> = {};
  for (const c of KATEGORIJE) {
    const v = ocene.map((o) => o.kategorije[c.id]).filter((x): x is number => x != null);
    if (v.length) out[c.id] = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100;
  }
  return out;
}
