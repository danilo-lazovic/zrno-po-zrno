/**
 * Crteži za Smenu u Kafeterija stilu (design/DESIGN.md): ravne boje, debela crna ivica, tvrda senka,
 * roze, zelena i krem. Sve je SVG iz koda, pa nema fajlova za preuzimanje i crteži su oštri na svakom ekranu.
 * Igra ih pretvara u teksture pri pokretanju (igra.ts, ucitajSvg).
 */

import type { Izgled } from "./model";
import type { Solja } from "./meni";

export const B = {
  ink: "#171717",
  bg: "#f2f0e1",
  card: "#fcfbf3",
  sand: "#e6e3d0",
  line: "#dad7c2",
  text2: "#3b392e",
  caption: "#66634f",
  pink: "#f5d8e7",
  pink2: "#d6589a",
  green: "#23a566",
  greenD: "#1b7a4c",
  yellow: "#ffc935",
  yellowL: "#fbebc7",
  mint: "#cde8da",
  blueL: "#dce4f5",
  red: "#b3362b",
  redL: "#fbd5cf",
  chrome: "#c9cdd1",
  chromeD: "#9ea4aa",
  chromeL: "#eef0f2",
  coffee: "#5a321d",
  crema: "#c8874a",
  milk: "#fffaf0",
  wood: "#d9b98c",
};

/** Debljina linije u koordinatama igre (1080 široko). */
const L = 6;
const iv = (w: number = L) => `stroke="${B.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const IV = iv();

export const svg = (w: number, h: number, telo: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${telo}</svg>`;

/** Oblik sa tvrdom senkom (kao kartice u portalu): isti oblik pomeren i pun crn, pa oblik preko. */
const senka = (oblik: string, dx = 8, dy = 8) =>
  `<g transform="translate(${dx} ${dy})">${oblik.replace(/fill="[^"]*"/g, `fill="${B.ink}"`)}</g>${oblik}`;

// ---------- gost ----------

export type Raspolozenje = "srecan" | "neutralan" | "nestrpljiv" | "ljut";

/** Gost od struka naviše, 320 × 440, gleda ka baristi. */
export function gost(iz: Izgled, r: Raspolozenje): string {
  const k = iz.koza;
  const kosa = iz.kosa;
  const iza = // duga kosa ide iza glave i ramena
    iz.frizura === 1 && !iz.kapa
      ? `<path d="M74 190 Q66 84 160 80 Q254 84 246 190 L258 330 Q206 352 160 340 Q114 352 62 330 Z" fill="${kosa}" ${IV}/>`
      : "";
  const telo = `<path d="M36 440 L36 372 Q36 300 112 284 L208 284 Q284 300 284 372 L284 440 Z" fill="${iz.majica}" ${IV}/>
    <path d="M128 284 L160 326 L192 284" fill="none" ${IV}/>
    <rect x="138" y="232" width="44" height="58" rx="10" fill="${k}" ${IV}/>
    <path d="M128 284 L160 326 L192 284" fill="${k}" stroke="none"/>
    <path d="M128 284 L160 326 L192 284" fill="none" ${IV}/>`;
  const usi = `<circle cx="84" cy="188" r="16" fill="${k}" ${IV}/><circle cx="236" cy="188" r="16" fill="${k}" ${IV}/>`;
  const glava = `<ellipse cx="160" cy="176" rx="78" ry="86" fill="${k}" ${IV}/>`;
  const frizure = [
    // kratka
    `<path d="M80 176 Q74 86 160 84 Q246 86 240 176 Q232 130 196 122 Q160 140 118 124 Q88 134 80 176 Z" fill="${kosa}" ${IV}/>`,
    // duga (preko čela šiške)
    `<path d="M80 184 Q76 88 160 86 Q244 88 240 184 Q226 120 160 126 Q110 124 80 184 Z" fill="${kosa}" ${IV}/>`,
    // punđa
    `<circle cx="160" cy="76" r="34" fill="${kosa}" ${IV}/><path d="M80 170 Q78 92 160 92 Q242 92 240 170 Q220 124 160 122 Q100 124 80 170 Z" fill="${kosa}" ${IV}/>`,
    // kovrdže
    `<g fill="${kosa}" ${IV}>${[
      [92, 150], [100, 112], [130, 92], [166, 84], [200, 94], [226, 116], [234, 152],
    ].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="30"/>`).join("")}</g>
     <path d="M96 150 Q120 128 160 130 Q200 128 224 150" fill="none" stroke="${kosa}" stroke-width="30"/>`,
    // ošišan
    `<path d="M86 150 Q96 92 160 90 Q224 92 234 150 Q200 126 160 126 Q120 126 86 150 Z" fill="${kosa}" ${IV}/>`,
  ];
  const kapa = iz.kapa
    ? `<path d="M80 150 Q82 70 160 68 Q238 70 240 150 Z" fill="${B.green}" ${IV}/><path d="M76 150 L250 150 Q290 152 300 166 L80 166 Z" fill="${B.greenD}" ${IV}/>`
    : "";
  const brada = iz.brada
    ? `<path d="M96 196 Q100 262 160 266 Q220 262 224 196 Q206 236 160 236 Q114 236 96 196 Z" fill="${kosa}" ${IV}/>`
    : "";
  const obrazi = `<circle cx="112" cy="214" r="14" fill="${B.pink2}" opacity=".28"/><circle cx="208" cy="214" r="14" fill="${B.pink2}" opacity=".28"/>`;
  const oci: Record<Raspolozenje, string> = {
    srecan: `<path d="M116 186 Q130 168 144 186 M176 186 Q190 168 204 186" fill="none" ${IV}/>`,
    neutralan: `<circle cx="130" cy="184" r="9" fill="${B.ink}"/><circle cx="190" cy="184" r="9" fill="${B.ink}"/>`,
    nestrpljiv: `<circle cx="130" cy="188" r="8" fill="${B.ink}"/><circle cx="190" cy="188" r="8" fill="${B.ink}"/>
      <path d="M114 166 L146 170 M174 170 L206 166" fill="none" ${IV}/>`,
    ljut: `<circle cx="130" cy="190" r="8" fill="${B.ink}"/><circle cx="190" cy="190" r="8" fill="${B.ink}"/>
      <path d="M112 162 L148 176 M172 176 L208 162" fill="none" ${IV}/>`,
  };
  const usta: Record<Raspolozenje, string> = {
    srecan: `<path d="M128 220 Q160 262 192 220 Z" fill="${B.ink}" ${IV}/><path d="M144 238 Q160 250 176 238" fill="${B.pink2}"/>`,
    neutralan: `<path d="M142 230 L178 230" fill="none" ${IV}/>`,
    nestrpljiv: `<path d="M138 234 Q150 226 160 234 Q170 242 182 234" fill="none" ${IV}/>`,
    ljut: `<path d="M136 242 Q160 220 184 242" fill="none" ${IV}/>`,
  };
  const naocare = iz.naocare
    ? `<g fill="${B.card}" fill-opacity=".35" ${IV}><rect x="104" y="166" width="54" height="40" rx="14"/><rect x="164" y="166" width="54" height="40" rx="14"/></g><path d="M158 182 L164 182" ${IV}/>`
    : "";
  return svg(320, 440, `${iza}${telo}${usi}${glava}${brada}${iz.kapa ? kapa : frizure[iz.frizura]}${obrazi}${oci[r]}${usta[r]}${naocare}`);
}

// ---------- šolje ----------

const SOLJA_VISINA = { soljica: 0.8, solja: 0.95, casa: 1.35 };

/** Veličina šolje sa strane za datu zapreminu (veća šolja je veća i na ekranu, ali umereno). */
export function velicinaSolje(s: Solja): { w: number; h: number } {
  const f = Math.pow(s.ml / 180, 0.42);
  const w = Math.round(130 * f);
  return { w: w + 70, h: Math.round(w * SOLJA_VISINA[s.oblik]) + 40 };
}

/** Šolja sa strane, sa tacnom; čaša je providna (tečnost crta igra iza nje). */
export function soljaSaStrane(s: Solja, boja: string = B.card): string {
  const { w, h } = velicinaSolje(s);
  const sw = w - 70;
  const x0 = 12;
  const telo = h - 40;
  if (s.oblik === "casa") {
    return svg(w, h, `<path d="M${x0} 8 L${x0 + sw} 8 L${x0 + sw - 12} ${telo} Q${x0 + sw / 2} ${telo + 10} ${x0 + 12} ${telo} Z"
      fill="${B.blueL}" fill-opacity=".35" ${IV}/>
      <path d="M${x0 + 18} 26 L${x0 + 26} ${telo - 22}" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".8"/>`);
  }
  const rucka = `<path d="M${x0 + sw - 6} ${telo * 0.22} Q${x0 + sw + 52} ${telo * 0.2} ${x0 + sw + 40} ${telo * 0.55} Q${x0 + sw + 30} ${telo * 0.78} ${x0 + sw - 14} ${telo * 0.72}"
    fill="none" stroke="${B.ink}" stroke-width="${L + 12}" stroke-linecap="round"/>
    <path d="M${x0 + sw - 6} ${telo * 0.22} Q${x0 + sw + 52} ${telo * 0.2} ${x0 + sw + 40} ${telo * 0.55} Q${x0 + sw + 30} ${telo * 0.78} ${x0 + sw - 14} ${telo * 0.72}"
    fill="none" stroke="${boja}" stroke-width="10" stroke-linecap="round"/>`;
  const tacna = `<ellipse cx="${x0 + sw / 2}" cy="${telo + 14}" rx="${sw / 2 + 26}" ry="16" fill="${boja}" ${IV}/>`;
  const sudic = `<path d="M${x0} 8 L${x0 + sw} 8 Q${x0 + sw} ${telo} ${x0 + sw / 2} ${telo} Q${x0} ${telo} ${x0} 8 Z" fill="${boja}" ${IV}/>`;
  const traka = `<path d="M${x0 + 4} 30 L${x0 + sw - 4} 30" stroke="${B.green}" stroke-width="10"/>`;
  return svg(w, h, `${rucka}${tacna}${sudic}${traka}`);
}

// ---------- oprema ----------

/** Portafilter sa strane: korpa desno, drška levo; 360 × 110 (korpa od x 220 do 340). */
export function portafilter(): string {
  return svg(360, 110, `<rect x="10" y="40" width="190" height="34" rx="17" fill="${B.ink}" ${IV}/>
    <path d="M190 52 L226 52 L226 64 L190 64 Z" fill="${B.chromeD}" ${IV}/>
    <path d="M216 26 L344 26 L334 88 Q280 100 226 88 Z" fill="${B.chrome}" ${IV}/>
    <path d="M232 40 L326 40" stroke="#fff" stroke-width="6" opacity=".7"/>`);
}

/** Tamper: drvena drška i inoks baza; 120 × 220. */
export function tamper(): string {
  return svg(120, 220, `<ellipse cx="60" cy="40" rx="34" ry="34" fill="${B.wood}" ${IV}/>
    <path d="M42 64 L78 64 L70 150 L50 150 Z" fill="${B.wood}" ${IV}/>
    <rect x="10" y="150" width="100" height="56" rx="10" fill="${B.chrome}" ${IV}/>
    <path d="M22 166 L98 166" stroke="#fff" stroke-width="6" opacity=".7"/>`);
}

/** Latijera sa strane, 240 × 260; kljun levo, drška desno. Unutrašnjost za nivo mleka: x 30–170, y 40–236. */
export function latijera(): string {
  return svg(240, 260, `<path d="M170 70 Q236 70 226 140 Q218 196 170 196" fill="none" stroke="${B.ink}" stroke-width="22" stroke-linecap="round"/>
    <path d="M170 70 Q236 70 226 140 Q218 196 170 196" fill="none" stroke="${B.chromeD}" stroke-width="10" stroke-linecap="round"/>
    <path d="M10 26 L40 40 L176 34 L176 240 Q100 252 30 240 Z" fill="${B.chrome}" ${IV}/>
    <path d="M52 64 L60 220" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".7"/>
    <path d="M40 120 L176 120 M40 170 L176 170" stroke="${B.chromeD}" stroke-width="4" stroke-dasharray="10 10"/>`);
}

/** Tetrapak mleka 140 × 230 u boji vrste; natpis dodaje igra. */
export function tetrapak(boja: string): string {
  return svg(140, 230, `${senka(`<path d="M14 60 L70 18 L126 60 L126 222 L14 222 Z" fill="${B.card}" ${IV}/>`, 6, 6)}
    <path d="M14 60 L126 60" ${IV}/><rect x="52" y="6" width="36" height="22" rx="4" fill="${boja}" ${IV}/>
    <rect x="14" y="100" width="112" height="86" fill="${boja}" ${IV}/>
    <circle cx="70" cy="80" r="10" fill="${B.ink}"/>`);
}

/** Mlin: levak sa zrnima, telo, ekran, točkić granulacije, viljuška; 520 × 1000. Portafilter stoji na y ≈ 770. */
export function mlin(): string {
  const zrna = Array.from({ length: 26 }, (_, i) => {
    const x = 160 + ((i * 53) % 200);
    const y = 120 + ((i * 37) % 120) + (i % 3) * 10;
    return `<g transform="translate(${x} ${y}) rotate(${(i * 47) % 180})"><ellipse rx="16" ry="11" fill="${B.coffee}" stroke="${B.ink}" stroke-width="3"/><path d="M-12 0 Q0 -4 12 0" stroke="${B.crema}" stroke-width="3" fill="none"/></g>`;
  }).join("");
  return svg(520, 1000, `
    <path d="M130 30 L390 30 L330 300 L190 300 Z" fill="${B.blueL}" fill-opacity=".55" ${IV}/>
    <clipPath id="lv"><path d="M130 30 L390 30 L330 300 L190 300 Z"/></clipPath>
    <g clip-path="url(#lv)">${zrna}<rect x="100" y="250" width="320" height="60" fill="${B.coffee}"/></g>
    <path d="M150 52 L172 280" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".7"/>
    <rect x="176" y="296" width="168" height="34" rx="6" fill="${B.chromeD}" ${IV}/>
    ${senka(`<path d="M110 330 L410 330 Q440 330 440 360 L440 940 L80 940 L80 360 Q80 330 110 330 Z" fill="${B.ink}" ${IV}/>`, 10, 10)}
    <rect x="130" y="380" width="260" height="120" rx="14" fill="#0f2a1c" stroke="${B.chromeD}" stroke-width="6"/>
    <circle cx="260" cy="590" r="70" fill="${B.chrome}" ${IV}/>
    <circle cx="260" cy="590" r="40" fill="${B.chromeL}" ${IV}/>
    <path d="M226 680 L294 680 L284 720 L236 720 Z" fill="${B.chrome}" ${IV}/>
    <path d="M150 760 L180 760 L180 840 L150 840 Z M340 760 L370 760 L370 840 L340 840 Z" fill="${B.chromeD}" ${IV}/>
    <rect x="40" y="930" width="440" height="56" rx="12" fill="${B.chromeD}" ${IV}/>
    <path d="M70 948 L450 948" stroke="#fff" stroke-width="5" opacity=".6"/>`);
}

/** Espreso aparat sa dve grupe, 1000 × 920; grupe su na x 290 i 710, donja ivica glave na y 560, rešetka na y 850. */
export function aparat(): string {
  const grupa = (x: number) => `<rect x="${x - 70}" y="470" width="140" height="56" rx="10" fill="${B.chrome}" ${IV}/>
    <path d="M${x - 58} 526 L${x + 58} 526 L${x + 46} 560 L${x - 46} 560 Z" fill="${B.chromeD}" ${IV}/>
    <path d="M${x - 50} 486 L${x + 50} 486" stroke="#fff" stroke-width="6" opacity=".7"/>
    <circle cx="${x}" cy="420" r="26" fill="${B.ink}" ${IV}/><circle cx="${x}" cy="420" r="10" fill="${B.green}"/>`;
  return svg(1000, 920, `
    <rect x="40" y="40" width="920" height="40" rx="8" fill="${B.chrome}" ${IV}/>
    <path d="M60 40 L60 8 M940 40 L940 8 M60 12 L940 12" fill="none" ${IV}/>
    ${senka(`<path d="M40 80 L960 80 L960 470 Q960 500 930 500 L70 500 Q40 500 40 470 Z" fill="${B.pink}" ${IV}/>`, 10, 10)}
    <rect x="40" y="100" width="920" height="26" fill="${B.green}" ${IV}/>
    <circle cx="500" cy="250" r="78" fill="${B.card}" ${IV}/>
    <circle cx="500" cy="250" r="62" fill="none" stroke="${B.line}" stroke-width="4"/>
    ${Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI * (0.8 + (i / 8) * 1.4);
      return `<path d="M${500 + Math.cos(a) * 50} ${250 + Math.sin(a) * 50} L${500 + Math.cos(a) * 62} ${250 + Math.sin(a) * 62}" ${iv(4)}/>`;
    }).join("")}
    <path d="M500 250 L540 214" ${IV}/><circle cx="500" cy="250" r="8" fill="${B.ink}"/>
    <rect x="410" y="350" width="180" height="56" rx="12" fill="${B.ink}"/>
    <text x="500" y="388" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="26" fill="${B.pink}">KAFETERIJA</text>
    ${grupa(290)}${grupa(710)}
    <rect x="40" y="850" width="920" height="60" rx="12" fill="${B.chromeD}" ${IV}/>
    ${Array.from({ length: 22 }, (_, i) => `<path d="M${76 + i * 40} 864 L${76 + i * 40} 896" stroke="${B.ink}" stroke-width="6" stroke-linecap="round"/>`).join("")}`);
}

/** Stimer: cev sa strane aparata do vrha na (40, 520) lokalno; 200 × 540. */
export function stimer(): string {
  return svg(200, 540, `<path d="M180 20 Q180 140 120 220 Q50 320 40 520" fill="none" stroke="${B.ink}" stroke-width="34" stroke-linecap="round"/>
    <path d="M180 20 Q180 140 120 220 Q50 320 40 520" fill="none" stroke="${B.chrome}" stroke-width="20" stroke-linecap="round"/>
    <path d="M176 40 Q174 130 128 200" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/>
    <rect x="150" y="60" width="50" height="70" rx="10" fill="${B.ink}"/>`);
}

/** Termometar sa skalom 0–80 °C i zelenom zonom; kazaljku crta igra. 300 × 300, centar (150,160). */
export function termometar(zona: [number, number]): string {
  const ugao = (t: number) => Math.PI * (0.75 + (t / 80) * 1.5);
  const tacka = (t: number, r: number) => `${150 + Math.cos(ugao(t)) * r} ${160 + Math.sin(ugao(t)) * r}`;
  const luk = (a: number, b: number, r: number) => `M${tacka(a, r)} A${r} ${r} 0 ${ugao(b) - ugao(a) > Math.PI ? 1 : 0} 1 ${tacka(b, r)}`;
  const crte = Array.from({ length: 9 }, (_, i) => `<path d="M${tacka(i * 10, 108)} L${tacka(i * 10, 126)}" ${iv(5)}/>`).join("");
  const brojevi = [0, 20, 40, 60, 80]
    .map((t) => {
      const [x, y] = tacka(t, 88).split(" ").map(Number);
      return `<text x="${x}" y="${y + 9}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="${B.ink}">${t}</text>`;
    })
    .join("");
  return svg(300, 300, `${senka(`<circle cx="150" cy="160" r="140" fill="${B.card}" ${IV}/>`, 8, 8)}
    <path d="${luk(zona[0], zona[1], 116)}" fill="none" stroke="${B.green}" stroke-width="22"/>
    <path d="${luk(70, 80, 116)}" fill="none" stroke="${B.red}" stroke-width="22"/>
    ${crte}${brojevi}`);
}

// ---------- pozadine ----------

/** Zid sa pločicama i radna ploča; ploča počinje na `ploca` (y). */
export function zid(w: number, h: number, ploca: number, boja: string = B.bg): string {
  const plocice = [];
  for (let y = 0; y < ploca; y += 70) {
    plocice.push(`<path d="M0 ${y} L${w} ${y}" stroke="${B.line}" stroke-width="3"/>`);
    for (let x = (y / 70) % 2 ? 0 : 70; x < w; x += 140) plocice.push(`<path d="M${x} ${y} L${x} ${y + 70}" stroke="${B.line}" stroke-width="3"/>`);
  }
  return svg(w, h, `<rect width="${w}" height="${h}" fill="${boja}"/>${plocice.join("")}
    <rect x="-10" y="${ploca}" width="${w + 20}" height="34" fill="${B.sand}" ${IV}/>
    <rect x="-10" y="${ploca + 34}" width="${w + 20}" height="${h - ploca}" fill="${B.wood}" ${IV}/>
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${-10} ${ploca + 80 + i * 46} Q${w / 2} ${ploca + 70 + i * 46 + (i % 2) * 18} ${w + 10} ${ploca + 84 + i * 46}" stroke="#c4a073" stroke-width="4" fill="none"/>`).join("")}`);
}

/** Kasa, zadnji plan: roze zid, tabla za meni, police i lampe (logo i meni dodaje igra). */
export function kasaZid(w: number, h: number): string {
  const lampa = (x: number) => `<path d="M${x} 0 L${x} 70" ${IV}/>
    <path d="M${x - 60} 130 L${x - 34} 70 L${x + 34} 70 L${x + 60} 130 Z" fill="${B.yellow}" ${IV}/>
    <circle cx="${x}" cy="140" r="14" fill="${B.yellowL}" ${IV}/>`;
  const tegla = (x: number, boja: string) => `<rect x="${x}" y="240" width="64" height="86" rx="12" fill="${B.blueL}" fill-opacity=".5" ${IV}/>
    <rect x="${x + 6}" y="270" width="52" height="50" rx="8" fill="${boja}"/><rect x="${x + 8}" y="228" width="48" height="18" rx="4" fill="${B.ink}"/>`;
  return svg(w, h, `<rect width="${w}" height="${h}" fill="${B.pink}"/>
    ${Array.from({ length: 14 }, (_, i) => `<path d="M${i * 80 + 40} 0 L${i * 80 + 40} ${h}" stroke="#fff" stroke-width="18" opacity=".25"/>`).join("")}
    ${lampa(110)}${lampa(970)}
    <rect x="308" y="44" width="480" height="420" rx="26" fill="${B.ink}"/>
    <rect x="300" y="36" width="480" height="420" rx="26" fill="#203328" ${IV}/>
    <rect x="318" y="54" width="444" height="384" rx="16" fill="none" stroke="${B.bg}" stroke-width="3" stroke-dasharray="14 10" opacity=".5"/>
    <rect x="820" y="326" width="230" height="22" rx="6" fill="${B.wood}" ${IV}/>
    ${tegla(836, B.coffee)}${tegla(910, B.crema)}${tegla(984, B.greenD)}`);
}

/** Kasa, prednji plan: pult sa kasom i teglom za napojnice; gosti stoje iza njega. Pult počinje na y 830. */
export function kasaPult(w: number, h: number): string {
  const pult = 830;
  return svg(w, h, `<rect x="808" y="${pult - 150}" width="200" height="150" rx="16" fill="${B.ink}" ${IV}/>
    <rect x="828" y="${pult - 132}" width="160" height="70" rx="8" fill="${B.pink}"/>
    <rect x="836" y="${pult - 46}" width="144" height="30" rx="6" fill="${B.chromeD}"/>
    <rect x="700" y="${pult - 110}" width="96" height="112" rx="18" fill="${B.blueL}" fill-opacity=".55" ${IV}/>
    <rect x="712" y="${pult - 128}" width="72" height="22" rx="6" fill="${B.green}" ${IV}/>
    <rect x="-10" y="${pult}" width="${w + 20}" height="60" rx="10" fill="${B.sand}" ${IV}/>
    <rect x="-10" y="${pult + 60}" width="${w + 20}" height="${h - pult}" fill="${B.card}" ${IV}/>
    ${Array.from({ length: 13 }, (_, i) => `<path d="M${40 + i * 84} ${pult + 80} L${40 + i * 84} ${h}" stroke="${B.line}" stroke-width="5"/>`).join("")}
    <rect x="-10" y="${h - 60}" width="${w + 20}" height="34" fill="${B.green}" ${IV}/>`);
}

/** Frižider sa dve police, 320 × 720. */
export function frizider(): string {
  return svg(320, 720, `${senka(`<rect x="10" y="10" width="290" height="690" rx="22" fill="${B.card}" ${IV}/>`, 8, 8)}
    <rect x="34" y="34" width="242" height="640" rx="12" fill="${B.blueL}" ${IV}/>
    <rect x="34" y="330" width="242" height="16" fill="${B.chrome}" ${IV}/>
    <rect x="34" y="620" width="242" height="16" fill="${B.chrome}" ${IV}/>
    <path d="M60 60 L80 300" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".6"/>`);
}

/** Šank odozgo: drvena ploča sa daskama i podmetačem za šolju. */
export function sankPozadina(w: number, h: number): string {
  return svg(w, h, `<rect width="${w}" height="${h}" fill="${B.wood}"/>
    ${Array.from({ length: 8 }, (_, i) => `<path d="M0 ${i * 170 + 100} L${w} ${i * 170 + 100}" stroke="#c4a073" stroke-width="5"/>
      <path d="M${(i * 290) % w} ${i * 170 + 100} L${(i * 290) % w} ${i * 170 + 270}" stroke="#c4a073" stroke-width="5"/>`).join("")}
    <rect x="160" y="140" width="760" height="760" rx="60" fill="${B.ink}" opacity=".12"/>`);
}

// ---------- sitnice ----------

/** Mekan beli krug za paru (čestice). */
export function para(): string {
  return svg(64, 64, `<defs><radialGradient id="p"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="32" cy="32" r="32" fill="url(#p)"/>`);
}

/** Zrno kafe (za napojnice i konfete). */
export function zrno(): string {
  return svg(48, 48, `<g transform="rotate(-30 24 24)"><ellipse cx="24" cy="24" rx="15" ry="20" fill="${B.coffee}" stroke="${B.ink}" stroke-width="4"/>
    <path d="M24 6 Q16 24 24 42" stroke="${B.crema}" stroke-width="4" fill="none"/></g>`);
}

/** Ikonice za trake i karte: [ime, putanje u 48 × 48]. */
export const IKONE: Record<string, string> = {
  kasa: `<rect x="8" y="18" width="32" height="22" rx="4"/><path d="M14 18 L14 10 L34 10 L34 18 M16 28 L32 28"/>`,
  mlin: `<path d="M14 6 L34 6 L30 18 L18 18 Z"/><rect x="14" y="18" width="20" height="18" rx="3"/><path d="M12 42 L36 42 M24 36 L24 42"/>`,
  aparat: `<rect x="6" y="8" width="36" height="20" rx="4"/><path d="M16 28 L16 34 M32 28 L32 34"/><path d="M10 42 L38 42"/>`,
  mleko: `<path d="M12 12 L16 8 L36 8 L36 40 Q24 44 12 40 Z"/><path d="M36 16 Q44 16 43 26 Q42 34 36 34"/>`,
  sank: `<path d="M10 16 L34 16 L32 36 Q22 40 12 36 Z"/><path d="M34 20 Q42 20 41 27 Q40 32 33 32"/><path d="M6 42 L40 42"/>`,
};

export function ikona(ime: string, boja: string = B.ink, velicina = 64): string {
  return svg(velicina, velicina, `<g transform="scale(${velicina / 48})" fill="none" stroke="${boja}" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round">${IKONE[ime]}</g>`);
}
