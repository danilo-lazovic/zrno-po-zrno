/**
 * Smena u Kafeteriji: igra u stilu Papa's igara (Phaser 3). Gosti poručuju pića sa menija kursa, a polaznik
 * ih pravi kroz pet stanica kao za pravim šankom: kasa, mlin (doza i tamp), aparat (šolja, tara, šot),
 * mleko (vrsta, količina, para) i šank (sipanje i posluženje). Svaki gost oceni piće po stanicama.
 *
 * Pravila su u model.ts, crteži u crtezi.ts; ovde su prikaz i unos. Ekran je 1080 × 1920 (uspravan telefon),
 * Phaser ga skalira na prostor koji dobije.
 */

import * as Phaser from "phaser";
import { sfx } from "@/lib/jezgro";
import { type PokreniIgru, type RezultatIgre, zvezdiceZa } from "../ugovor";
import * as C from "./crtezi";
import { B } from "./crtezi";
import { type Meni, PENA_OPSEG, type Pice, dostupnaPica, opseg, receptRedovi } from "./meni";
import * as M from "./model";

export type KonfiguracijaSmene = {
  meni: Meni;
  /** nivoi kursa koje je polaznik završio (otključavaju pića) */
  zavrseni: string[];
  /** broj gostiju u smeni */
  gostiju?: number;
};

const W = 1080;
const H = 1920;
/** stanica zauzima prostor između trake sa porudžbinama i dugmadi stanica */
const VRH = 360;
const VIS = 1360;
const PLOCA = 1000;
const DUGMAD_Y = 1170;
const KLJUC_OBUKA = "zpz-smena-obuka";

/**
 * Raspored opreme u razmeri (crtezi.PX_CM): korpa portafiltera ima gornju ivicu na (245, 10) u crtežu.
 * Na mlinu korpa stoji ispod izliva (300, 786), na podlozi za tamp na (830, 926); u aparatu ispod glave grupe.
 */
const PF_KORPA = { x: 245, y: 10 };
const MLIN_PF = { x: 300 - PF_KORPA.x, y: 786 - PF_KORPA.y };
const PODLOGA_PF = { x: 830 - PF_KORPA.x, y: 926 - PF_KORPA.y };
const APARAT_Y = 230;
const GRUPA_DNO = APARAT_Y + 470;
const RESETKA = APARAT_Y + 720;

type StanicaId = "kasa" | "mlin" | "aparat" | "mleko" | "sank";
const STANICE: { id: StanicaId; naziv: string }[] = [
  { id: "kasa", naziv: "Kasa" },
  { id: "mlin", naziv: "Mlin" },
  { id: "aparat", naziv: "Aparat" },
  { id: "mleko", naziv: "Mleko" },
  { id: "sank", naziv: "Šank" },
];

const SAVETI: Record<M.Kategorija, string> = {
  doza: "Doza: melji dok vaga ne pokaže dozu iz recepta. Mlin malo dobaci i posle puštanja.",
  tamp: "Tamp: drži do 13–20 kg, pa pusti.",
  sot: "Šot: prati vagu i tajmer. Prebrz šot znači sitnije mlevenje, spor krupnije.",
  procedura: "Procedura: šolja na vagu, pa Tara, pa start.",
  solja: "Šolje: svako piće ima svoju šolju. Pogledaj recept.",
  mleko: "Mleko: prvo vazduh (vrh na površini), pa vrtlog sa potopljenim vrhom. Isključi paru u zelenoj zoni.",
  sipanje: "Sipanje: sa visine do pola šolje, pa spusti latijeru za crtež. Ne prelivaj.",
  cekanje: "Brzina: dok šot teče, pripremi mleko za isto piće.",
};

const boja = (h: string) => parseInt(h.slice(1), 16);
const zarez = (x: number, d = 1) => x.toFixed(d).replace(".", ",");
const k01 = (x: number) => Math.max(0, Math.min(1, x));

type KorakObuke = {
  /** stanica na kojoj se korak radi */
  st: StanicaId;
  tekst: () => string;
  /** gde da tapne (koordinate igre), ili null */
  gde: () => [number, number] | null;
  gotovo: () => boolean;
};

type Porudzbina = {
  gost: M.Gost;
  n: M.Napitak;
  pogled: GostPogled;
  /** grupa aparata u kojoj je šot (0, 1) */
  grupa: number | null;
  /** šank: koliko mleka je sipano sa visine i nisko, i veličina tačke za crtež */
  visoko: number;
  nisko: number;
  tacka: number;
};

type GostPogled = {
  gost: M.Gost;
  slika: Phaser.GameObjects.Image;
  /** sekunda smene kad je ušao (od tada se meri čekanje) */
  dosao: number;
  raspolozenje: C.Raspolozenje;
  stigao: boolean;
};

type Grupa = {
  x: number;
  por: Porudzbina | null;
  pf: boolean;
  tece: boolean;
  t: number;
  q: number;
  kafa: number;
  tara: number;
  gotova: boolean;
  upozoren: boolean;
  hiss: { set(l: number, f?: number): void; stop(): void } | null;
};

// ---------- učitavanje crteža ----------

function ucitajSvg(scena: Phaser.Scene, kljuc: string, kod: string): Promise<void> {
  if (scena.textures.exists(kljuc)) return Promise.resolve();
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      try {
        if (!scena.textures.exists(kljuc)) scena.textures.addImage(kljuc, img);
      } catch {
        // igra je zatvorena dok se crtež učitavao
      }
      ok();
    };
    // crtež koji ne uspe ostaje prazan (Phaser crta zamensku teksturu), igra radi dalje
    img.onerror = () => ok();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(kod);
  });
}

function fontovi() {
  const cs = getComputedStyle(document.documentElement);
  const d = cs.getPropertyValue("--font-bricolage").trim();
  const t = cs.getPropertyValue("--font-hanken").trim();
  return { naslov: d ? `${d}, Arial, sans-serif` : "Arial, sans-serif", tekst: t ? `${t}, Arial, sans-serif` : "Arial, sans-serif" };
}
let F = { naslov: "Arial", tekst: "Arial" };

// ---------- dugme ----------

type DugmeOpcije = { boja?: string; tekstBoja?: string; velicina?: number; tap?: () => void; drzi?: (dole: boolean) => void };

/** Pilula sa crnom ivicom i tvrdom senkom, kao dugmad u aplikaciji. `drzi` je za dugmad koja se drže (mlin, para). */
class Dugme extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private natpis: Phaser.GameObjects.Text;
  private zona: Phaser.GameObjects.Rectangle;
  private pritisnut = false;
  omogucen = true;
  private bojaD: string;
  private tekstBoja: string;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly sir: number, readonly vis: number, tekst: string, private o: DugmeOpcije) {
    super(scene, x, y);
    this.bojaD = o.boja ?? B.card;
    this.tekstBoja = o.tekstBoja ?? B.ink;
    this.g = scene.add.graphics();
    this.natpis = scene.add
      .text(0, 0, tekst, { fontFamily: F.naslov, fontStyle: "800", fontSize: `${o.velicina ?? 40}px`, color: this.tekstBoja, align: "center", wordWrap: { width: sir - 30 } })
      .setOrigin(0.5);
    this.zona = scene.add.rectangle(0, 0, sir + 16, vis + 16, 0, 0).setInteractive({ useHandCursor: true });
    this.add([this.g, this.natpis, this.zona]);
    this.crtaj();
    this.zona.on("pointerdown", () => {
      if (!this.omogucen || this.pritisnut) return;
      this.pritisnut = true;
      this.crtaj();
      if (o.drzi) o.drzi(true);
      else sfx.tap();
      scene.input.once("pointerup", (_p: Phaser.Input.Pointer, nad: Phaser.GameObjects.GameObject[]) => this.pusti(nad.includes(this.zona)));
    });
    this.zona.on("pointerout", () => o.drzi && this.pusti(false));
    scene.add.existing(this);
  }

  private pusti(tap: boolean) {
    if (!this.pritisnut) return;
    this.pritisnut = false;
    this.crtaj();
    if (this.o.drzi) this.o.drzi(false);
    else if (tap && this.omogucen) this.o.tap?.();
  }

  private crtaj() {
    const { sir: w, vis: h } = this;
    const r = Math.min(h / 2, 60);
    const d = this.pritisnut ? 4 : 0;
    this.g.clear();
    if (!this.pritisnut) {
      this.g.fillStyle(boja(B.ink), 1);
      this.g.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w, h, r);
    }
    this.g.fillStyle(boja(this.bojaD), 1);
    this.g.fillRoundedRect(-w / 2 + d, -h / 2 + d, w, h, r);
    this.g.lineStyle(5, boja(B.ink), 1);
    this.g.strokeRoundedRect(-w / 2 + d, -h / 2 + d, w, h, r);
    this.natpis.setPosition(d, d);
    this.setAlpha(this.omogucen ? 1 : 0.4);
  }

  postavi(o: { tekst?: string; boja?: string; tekstBoja?: string; omogucen?: boolean }) {
    let crtaj = false;
    if (o.tekst != null && o.tekst !== this.natpis.text) this.natpis.setText(o.tekst);
    if (o.boja && o.boja !== this.bojaD) {
      this.bojaD = o.boja;
      crtaj = true;
    }
    if (o.tekstBoja && o.tekstBoja !== this.tekstBoja) {
      this.tekstBoja = o.tekstBoja;
      this.natpis.setColor(o.tekstBoja);
    }
    if (o.omogucen != null && o.omogucen !== this.omogucen) {
      this.omogucen = o.omogucen;
      if (!o.omogucen && this.pritisnut) this.pusti(false);
      crtaj = true;
    }
    if (crtaj) this.crtaj();
    return this;
  }
}

// ---------- scena ----------

class Smena extends Phaser.Scene {
  private meni: Meni;
  private pica: Pice[];
  private gosti: M.Gost[];
  private t = 0;
  private pauza = true;
  private spremno = false;
  private gotovaSmena = false;
  private sledeci = 0;
  private red: GostPogled[] = [];
  private cekaju: GostPogled[] = [];
  private porudzbine: Porudzbina[] = [];
  private aktivna: Porudzbina | null = null;
  private ocene: { ocena: M.Ocena; pice: string }[] = [];
  private napojnice = 0;
  private idealna: number;
  private granulacija: number;
  private grupe: Grupa[] = [];
  private stanica: StanicaId = "kasa";
  private kont = {} as Record<StanicaId, Phaser.GameObjects.Container>;
  private zvuci: { stop(): void }[] = [];

  // stalni delovi ekrana
  private sat!: Phaser.GameObjects.Text;
  private brojGostiju!: Phaser.GameObjects.Text;
  private novac!: Phaser.GameObjects.Text;
  private traka!: Phaser.GameObjects.Container;
  private karte: { por: Porudzbina; strp: Phaser.GameObjects.Graphics }[] = [];
  private tabovi: { id: StanicaId; g: Phaser.GameObjects.Graphics; znacka: Phaser.GameObjects.Text; tackica: Phaser.GameObjects.Graphics; cx: number }[] = [];
  private dugmeRecept!: Dugme;
  private obavestenje!: Phaser.GameObjects.Text;

  constructor(
    konf: KonfiguracijaSmene,
    private mirno: boolean,
    /** vođena smena: jedan gost, bez žurbe, uputstvo za svaki korak; rezultat se ne šalje */
    private obuka: boolean,
    private kraj: (r: Omit<RezultatIgre, "trajanje_ms">) => void,
    private ponovo: (obuka: boolean) => void,
  ) {
    super("smena");
    this.meni = konf.meni;
    this.pica = dostupnaPica(konf.meni, konf.zavrseni);
    const r = M.seme(Date.now() & 0xffffffff);
    this.idealna = 6;
    if (obuka) {
      // piće sa mlekom, da obuka prođe kroz svih pet stanica; mlin je uštiman
      const pice = this.pica.find((p) => p.mleko) ?? this.pica[0];
      this.gosti = [{ id: 1, ime: "Ana", izgled: M.noviIzgled(r), pice, mleko: pice.mleko ? konf.meni.mleka[0] : null, dolazak: 1 }];
      this.granulacija = this.idealna;
    } else {
      this.gosti = M.gostiSmene(this.pica, konf.meni.mleka, konf.gostiju ?? 5, r);
      // mlin je ujutru retko savršeno uštiman: polaznik vidi po prvom šotu da li da melje sitnije ili krupnije
      this.granulacija = this.idealna + [0, 0, 1, -1, 2, -2][Math.floor(r() * 6)];
    }
  }

  /** Strpljenje gosta; u vođenoj smeni gost čeka koliko treba. */
  private strpljenje(p: Pice) {
    return this.obuka ? 1e9 : M.strpljenje(p);
  }

  /** Ciljne vrednosti iz recepta se vide u vođenoj smeni i kad polaznik otvori recept. */
  private vidiCilj(p: Porudzbina | null) {
    return !!p && (this.obuka || p.n.recept);
  }

  preload() {
    this.load.image("znak", "/brand/kafeterija-znak.png");
    this.load.image("baner", "/brand/kafeterija-banner.png");
  }

  create() {
    F = fontovi();
    const ucitava = this.add.text(W / 2, H / 2, "Otvaram kafić…", { fontFamily: F.naslov, fontStyle: "800", fontSize: "52px", color: B.ink }).setOrigin(0.5);
    const solje = this.meni.solje.map((s) => ucitajSvg(this, `solja-${s.id}`, C.soljaSaStrane(s)));
    const mleka = this.meni.mleka.map((m) => ucitajSvg(this, `mleko-${m.id}`, C.tetrapak(m.boja)));
    const temp = [...new Set(this.pica.filter((p) => p.mleko).map((p) => p.mleko!.temp.join("-")))].map((z) =>
      ucitajSvg(this, `term-${z}`, C.termometar(z.split("-").map(Number) as [number, number])),
    );
    const gosti = this.gosti.flatMap((g) =>
      (["srecan", "neutralan", "nestrpljiv", "ljut"] as C.Raspolozenje[]).map((r) => ucitajSvg(this, `gost-${g.id}-${r}`, C.gost(g.izgled, r))),
    );
    const ikone = STANICE.map((s) => ucitajSvg(this, `ik-${s.id}`, C.ikona(s.id)));
    Promise.all([
      ucitajSvg(this, "zid", C.zid(W, VIS, PLOCA)),
      ucitajSvg(this, "kasa-zid", C.kasaZid(W, VIS)),
      ucitajSvg(this, "kasa-pult", C.kasaPult(W, VIS)),
      ucitajSvg(this, "sank", C.sankPozadina(W, VIS)),
      ucitajSvg(this, "mlin", C.mlin()),
      ucitajSvg(this, "aparat", C.aparat()),
      ucitajSvg(this, "stimer", C.stimer()),
      ucitajSvg(this, "portafilter", C.portafilter()),
      ucitajSvg(this, "tamper", C.tamper()),
      ucitajSvg(this, "latijera", C.latijera()),
      ucitajSvg(this, "para", C.para()),
      ucitajSvg(this, "zrno", C.zrno()),
      ...solje,
      ...mleka,
      ...temp,
      ...gosti,
      ...ikone,
    ]).then(() => {
      if (!this.sys || !this.sys.isActive()) return;
      ucitava.destroy();
      this.izgradi();
      this.spremno = true;
      if (this.obuka) this.uvodObuke();
      else this.uvod();
    });
  }

  /** Zaustavlja zvukove kad se igra zatvori usred smene. */
  ugasi() {
    this.zvuci.forEach((z) => z.stop());
    this.zvuci = [];
    this.grupe.forEach((g) => g.hiss?.stop());
  }

  private tekst(x: number, y: number, s: string, vel: number, o: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}) {
    return this.add.text(x, y, s, { fontFamily: F.tekst, fontStyle: "700", fontSize: `${vel}px`, color: B.ink, ...o });
  }

  private naslov(x: number, y: number, s: string, vel: number, o: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}) {
    return this.add.text(x, y, s, { fontFamily: F.naslov, fontStyle: "800", fontSize: `${vel}px`, color: B.ink, ...o });
  }

  private izgradi() {
    this.add.rectangle(0, 0, W, H, boja(B.bg)).setOrigin(0);
    for (const s of STANICE) {
      this.kont[s.id] = this.add.container(0, VRH).setVisible(s.id === this.stanica);
    }
    this.gradiKasu();
    this.gradiMlin();
    this.gradiAparat();
    this.gradiMleko();
    this.gradiSank();
    this.gradiVrh();
    this.gradiTabove();
    if (this.obuka) this.gradiVodic();
    this.obavestenje = this.naslov(W / 2, VRH + PLOCA - 20, "", 34, { backgroundColor: B.ink, color: B.bg, padding: { x: 28, y: 14 } })
      .setOrigin(0.5, 1)
      .setDepth(50)
      .setAlpha(0);
    this.osveziSve();
  }

  // ---------- vrh: sat, gosti, napojnice, traka sa porudžbinama ----------

  private gradiVrh() {
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(boja(B.card), 1);
    g.fillRect(0, 0, W, 100);
    g.lineStyle(5, boja(B.ink), 1);
    g.lineBetween(0, 100, W, 100);
    g.fillStyle(boja(B.sand), 1);
    g.fillRect(0, 102, W, VRH - 102);
    g.lineBetween(0, VRH, W, VRH);
    // žica na kojoj vise porudžbine
    g.lineStyle(6, boja(B.chromeD), 1);
    g.lineBetween(0, 128, W, 128);
    this.sat = this.naslov(30, 50, "08:00", 46).setOrigin(0, 0.5).setDepth(11);
    this.brojGostiju = this.tekst(390, 50, "", 34).setOrigin(0.5).setDepth(11);
    this.add.image(W - 250, 50, "zrno").setDepth(11).setScale(0.9);
    this.novac = this.naslov(W - 30, 50, "0 din", 42).setOrigin(1, 0.5).setDepth(11);
    this.traka = this.add.container(0, 0).setDepth(11);
    this.dugmeRecept = new Dugme(this, 640, 50, 170, 70, "Recept", {
      velicina: 32,
      boja: B.yellow,
      tap: () => this.aktivna && this.recept(this.aktivna),
    }).setDepth(20);
  }

  private osveziTraku() {
    this.traka.removeAll(true);
    this.karte = [];
    const sir = 244;
    this.porudzbine.slice(0, 4).forEach((p, i) => {
      const x = 22 + i * (sir + 18);
      const y = 120;
      const akt = p === this.aktivna;
      const c = this.add.container(x, y + (akt ? 12 : 0));
      const g = this.add.graphics();
      g.fillStyle(boja(B.ink), 1);
      g.fillRoundedRect(6, 6, sir, 214, 14);
      g.fillStyle(boja(B.card), 1);
      g.fillRoundedRect(0, 0, sir, 214, 14);
      g.fillStyle(boja(akt ? B.green : B.line), 1);
      g.fillRoundedRect(0, 0, sir, 30, { tl: 14, tr: 14, bl: 0, br: 0 });
      g.lineStyle(akt ? 7 : 5, boja(B.ink), 1);
      g.strokeRoundedRect(0, 0, sir, 214, 14);
      // štipaljka
      g.fillStyle(boja(B.wood), 1);
      g.fillRect(sir / 2 - 14, -16, 28, 40);
      g.lineStyle(4, boja(B.ink), 1);
      g.strokeRect(sir / 2 - 14, -16, 28, 40);
      c.add(g);
      c.add(this.naslov(16, 40, p.gost.pice.naziv, 34, { wordWrap: { width: sir - 26 }, lineSpacing: -6 }));
      if (p.gost.mleko) {
        const m = this.add.graphics();
        m.fillStyle(boja(p.gost.mleko.boja), 1);
        m.fillCircle(28, 128, 12);
        m.lineStyle(3, boja(B.ink), 1);
        m.strokeCircle(28, 128, 12);
        c.add([m, this.tekst(48, 128, p.gost.mleko.naziv, 24).setOrigin(0, 0.5)]);
      }
      c.add(this.tekst(16, 150, p.gost.ime, 22, { color: B.caption }));
      // koraci: mlin, šot, mleko
      const koraci: [string, boolean | null][] = [
        ["M", p.n.tamp != null],
        ["Š", p.n.sot != null],
        ["Ml", p.gost.pice.mleko ? !!p.n.mleko && p.n.mleko.temp >= 40 : null],
      ];
      koraci.forEach(([s, ok], j) => {
        const kx = sir - 92 + j * 32;
        const kg = this.add.graphics();
        kg.fillStyle(boja(ok == null ? B.line : ok ? B.green : B.card), 1);
        kg.fillCircle(kx, 160, 14);
        kg.lineStyle(3, boja(B.ink), ok == null ? 0.3 : 1);
        kg.strokeCircle(kx, 160, 14);
        c.add([kg, this.tekst(kx, 160, s, s.length > 1 ? 13 : 16, { color: ok ? "#fff" : B.ink }).setOrigin(0.5)]);
      });
      const strp = this.add.graphics();
      c.add(strp);
      const zona = this.add.rectangle(sir / 2, 107, sir, 214, 0, 0).setInteractive({ useHandCursor: true });
      zona.on("pointerdown", () => {
        if (this.aktivna === p) return;
        sfx.tap();
        this.aktivna = p;
        this.osveziSve();
      });
      c.add(zona);
      this.traka.add(c);
      this.karte.push({ por: p, strp });
    });
    if (this.porudzbine.length > 4) this.traka.add(this.tekst(W - 16, 330, `+${this.porudzbine.length - 4}`, 28).setOrigin(1, 0.5));
    if (!this.porudzbine.length)
      this.traka.add(this.tekst(W / 2, 236, this.red.length ? "Gost čeka na kasi." : "Nema porudžbina.", 32, { color: B.caption }).setOrigin(0.5));
    this.osveziStrpljenje();
  }

  private osveziStrpljenje() {
    for (const { por, strp } of this.karte) {
      const ostalo = k01(1 - (this.t - por.pogled.dosao) / this.strpljenje(por.gost.pice));
      strp.clear();
      strp.fillStyle(boja(B.sand), 1);
      strp.fillRoundedRect(16, 186, 212, 14, 7);
      strp.fillStyle(boja(ostalo > 0.5 ? B.green : ostalo > 0.2 ? B.yellow : B.red), 1);
      if (ostalo > 0) strp.fillRoundedRect(16, 186, Math.max(14, 212 * ostalo), 14, 7);
    }
  }

  // ---------- dugmad stanica ----------

  private gradiTabove() {
    const sir = W / STANICE.length;
    const y0 = VRH + VIS;
    const pod = this.add.graphics().setDepth(10);
    pod.fillStyle(boja(B.card), 1);
    pod.fillRect(0, y0, W, H - y0);
    pod.lineStyle(5, boja(B.ink), 1);
    pod.lineBetween(0, y0, W, y0);
    STANICE.forEach((s, i) => {
      const cx = sir * i + sir / 2;
      const g = this.add.graphics().setDepth(10);
      this.add.image(cx, y0 + 70, `ik-${s.id}`).setDepth(11);
      this.naslov(cx, y0 + 140, s.naziv, 32).setOrigin(0.5).setDepth(11);
      const tackica = this.add.graphics().setDepth(12);
      const znacka = this.tekst(cx + 52, y0 + 30, "", 24, { backgroundColor: B.ink, color: "#fff", padding: { x: 10, y: 4 } })
        .setOrigin(0.5)
        .setDepth(12);
      const zona = this.add.rectangle(cx, y0 + (H - y0) / 2, sir, H - y0, 0, 0).setInteractive({ useHandCursor: true }).setDepth(13);
      zona.on("pointerdown", () => this.idiNa(s.id));
      this.tabovi.push({ id: s.id, g, znacka, tackica, cx });
    });
  }

  private idiNa(id: StanicaId) {
    if (id === this.stanica) return;
    sfx.tap();
    // para i sipanje se ne ostavljaju bez nadzora
    this.paraIskljuci();
    this.stanica = id;
    for (const s of STANICE) this.kont[s.id].setVisible(s.id === id);
    this.osveziSve();
  }

  /** Sledeća stanica za aktivnu porudžbinu (žuta tačka na dugmetu). */
  private sledecaStanica(): StanicaId | null {
    const p = this.aktivna;
    if (!p) return this.red.length ? "kasa" : null;
    if (p.n.sot == null && (p.n.tamp == null || p.n.doza === 0) && !(p.grupa != null && this.grupe[p.grupa].por === p && this.grupe[p.grupa].pf)) return "mlin";
    if (p.n.sot == null) return "aparat";
    if (p.gost.pice.mleko && (!p.n.mleko || p.n.mleko.temp < 40)) return "mleko";
    return "sank";
  }

  private osveziTabove() {
    const sir = W / STANICE.length;
    const y0 = VRH + VIS;
    const sledeca = this.sledecaStanica();
    for (const tb of this.tabovi) {
      const akt = tb.id === this.stanica;
      tb.g.clear();
      if (akt) {
        tb.g.fillStyle(boja(B.pink), 1);
        tb.g.fillRoundedRect(tb.cx - sir / 2 + 10, y0 + 12, sir - 20, H - y0 - 24, 24);
        tb.g.lineStyle(5, boja(B.ink), 1);
        tb.g.strokeRoundedRect(tb.cx - sir / 2 + 10, y0 + 12, sir - 20, H - y0 - 24, 24);
      }
      tb.tackica.clear();
      if (tb.id === sledeca && !akt) {
        tb.tackica.fillStyle(boja(B.yellow), 1);
        tb.tackica.fillCircle(tb.cx - 52, y0 + 34, 16);
        tb.tackica.lineStyle(4, boja(B.ink), 1);
        tb.tackica.strokeCircle(tb.cx - 52, y0 + 34, 16);
      }
      let z = "";
      if (tb.id === "kasa" && this.red.length) z = String(this.red.length);
      if (tb.id === "aparat") {
        const tece = this.grupe.filter((g) => g.tece);
        if (tece.length) z = `${Math.round(tece[0].kafa)} g`;
      }
      tb.znacka.setText(z).setVisible(!!z);
    }
  }

  // ---------- poruke i prozori ----------

  private javi(s: string) {
    this.obavestenje.setText(s);
    this.tweens.killTweensOf(this.obavestenje);
    this.obavestenje.setAlpha(1);
    this.tweens.add({ targets: this.obavestenje, alpha: 0, delay: 1800, duration: 400 });
  }

  /** Prozor preko igre; smena stoji dok je otvoren. */
  private prozor(visina: number, gradi: (c: Phaser.GameObjects.Container, zatvori: () => void, sir: number) => void, posle?: () => void) {
    this.pauza = true;
    this.paraIskljuci();
    const sir = 940;
    const zatamni = this.add.rectangle(0, 0, W, H, boja(B.ink), 0.55).setOrigin(0).setDepth(90).setInteractive();
    const c = this.add.container((W - sir) / 2, Math.max(60, (H - visina) / 2)).setDepth(91);
    const g = this.add.graphics();
    g.fillStyle(boja(B.ink), 1);
    g.fillRoundedRect(10, 10, sir, visina, 34);
    g.fillStyle(boja(B.card), 1);
    g.fillRoundedRect(0, 0, sir, visina, 34);
    g.lineStyle(6, boja(B.ink), 1);
    g.strokeRoundedRect(0, 0, sir, visina, 34);
    c.add(g);
    const zatvori = () => {
      zatamni.destroy();
      c.destroy();
      this.pauza = false;
      posle?.();
    };
    gradi(c, zatvori, sir);
    this.osveziVodic();
    if (!this.mirno) {
      c.setScale(0.92).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: "Back.Out" });
    }
  }

  private uvod() {
    const imena = this.pica.map((p) => p.naziv).join(", ");
    let prviPut = true;
    try {
      prviPut = localStorage.getItem(KLJUC_OBUKA) !== "1";
    } catch {
      /* bez skladišta: nudi se vođena smena */
    }
    this.prozor(1320, (c, zatvori, sir) => {
      c.add(this.naslov(sir / 2, 70, "Smena u Kafeteriji", 64).setOrigin(0.5, 0));
      c.add(this.tekst(sir / 2, 170, `Danas na meniju: ${imena}.`, 34, { color: B.text2, align: "center", wordWrap: { width: sir - 120 } }).setOrigin(0.5, 0));
      const koraci: [StanicaId, string][] = [
        ["kasa", "Kasa: primi porudžbinu."],
        ["mlin", "Mlin: doza i tamp."],
        ["aparat", "Aparat: šolja, tara, šot."],
        ["mleko", "Mleko: vrsta, količina, para."],
        ["sank", "Šank: sipaj i posluži."],
      ];
      koraci.forEach(([id, s], i) => {
        const y = 330 + i * 110;
        const kg = this.add.graphics();
        kg.fillStyle(boja(B.pink), 1);
        kg.fillCircle(130, y, 46);
        kg.lineStyle(5, boja(B.ink), 1);
        kg.strokeCircle(130, y, 46);
        c.add([kg, this.add.image(130, y, `ik-${id}`).setScale(0.9), this.tekst(200, y, s, 36).setOrigin(0, 0.5)]);
      });
      c.add(
        this.tekst(sir / 2, 880, "Gost ocenjuje svaki korak. Žuta tačka na dnu pokazuje sledeću stanicu. Ako ne otvaraš recept, gost daje +20 din.", 30, {
          color: B.caption,
          align: "center",
          wordWrap: { width: sir - 120 },
        }).setOrigin(0.5, 0),
      );
      // prvi put je vođena smena glavno dugme; posle je sporedno
      const vodjena = new Dugme(this, sir / 2, prviPut ? 1050 : 1200, 620, prviPut ? 130 : 100, prviPut ? "Vođena smena" : "Ponovi vođenu smenu", {
        boja: prviPut ? B.yellow : B.card,
        velicina: prviPut ? 44 : 34,
        tap: () => this.ponovo(true),
      });
      const otvori = new Dugme(this, sir / 2, prviPut ? 1200 : 1060, 620, prviPut ? 100 : 130, "Otvori kafić", {
        boja: B.green,
        tekstBoja: "#fff",
        velicina: prviPut ? 34 : 46,
        tap: zatvori,
      });
      c.add([vodjena, otvori]);
    });
  }

  private uvodObuke() {
    this.prozor(760, (c, zatvori, sir) => {
      c.add(this.naslov(sir / 2, 70, "Vođena smena", 64).setOrigin(0.5, 0));
      c.add(
        this.tekst(sir / 2, 180, "Jedan gost i jedno piće, bez žurbe. Žuta kartica kaže šta je sledeće, a žuti krug pokazuje gde da tapneš.", 36, {
          color: B.text2,
          align: "center",
          wordWrap: { width: sir - 120 },
        }).setOrigin(0.5, 0),
      );
      c.add(new Dugme(this, sir / 2, 600, 520, 130, "Kreni", { boja: B.yellow, velicina: 46, tap: zatvori }));
    });
  }

  private recept(p: Porudzbina) {
    p.n.recept = true;
    const redovi = receptRedovi(p.gost.pice, this.meni);
    const vis = 360 + redovi.length * 88;
    this.prozor(vis, (c, zatvori, sir) => {
      c.add(this.naslov(sir / 2, 56, p.gost.pice.naziv, 60).setOrigin(0.5, 0));
      if (p.gost.mleko) c.add(this.tekst(sir / 2, 132, `${p.gost.mleko.naziv} mleko · ${p.gost.ime}`, 30, { color: B.caption }).setOrigin(0.5, 0));
      redovi.forEach(([k, v], i) => {
        const y = 210 + i * 88;
        const g = this.add.graphics();
        g.lineStyle(3, boja(B.line), 1);
        g.lineBetween(60, y + 70, sir - 60, y + 70);
        c.add([g, this.tekst(60, y + 30, k, 34, { color: B.caption }).setOrigin(0, 0.5), this.naslov(sir - 60, y + 30, v, 36).setOrigin(1, 0.5)]);
      });
      c.add(new Dugme(this, sir / 2, vis - 90, 400, 110, "Zatvori", { tap: zatvori }));
    });
  }

  // ---------- kasa ----------

  private kasaGosti!: Phaser.GameObjects.Container;
  private balon!: Phaser.GameObjects.Container;
  private balonTekst!: Phaser.GameObjects.Text;
  private dugmePrimi!: Dugme;
  private tegla!: Phaser.GameObjects.Text;

  private gradiKasu() {
    const k = this.kont.kasa;
    k.add(this.add.image(0, 0, "kasa-zid").setOrigin(0));
    if (this.textures.exists("znak")) k.add(this.add.image(150, 270, "znak").setDisplaySize(200, 200));
    k.add(this.naslov(540, 70, "MENI", 54, { color: B.yellow }).setOrigin(0.5, 0));
    this.pica.slice(0, 6).forEach((p, i) => {
      k.add(this.tekst(360, 160 + i * 46, p.naziv, 34, { color: B.bg }));
      if (p.mleko) k.add(this.tekst(720, 168 + i * 46, "sa mlekom", 24, { color: B.mint }).setOrigin(1, 0));
    });
    this.kasaGosti = this.add.container(0, 0);
    k.add(this.kasaGosti);
    k.add(this.add.image(0, 0, "kasa-pult").setOrigin(0));
    if (this.textures.exists("baner")) k.add(this.add.image(540, 1150, "baner").setDisplaySize(700, 168));
    this.tegla = this.naslov(748, 790, "", 26).setOrigin(0.5);
    k.add(this.tegla);

    this.balon = this.add.container(500, 236).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(boja(B.ink), 1);
    bg.fillRoundedRect(-330 + 8, -110 + 8, 660, 190, 40);
    bg.fillStyle(boja(B.card), 1);
    bg.fillRoundedRect(-330, -110, 660, 190, 40);
    bg.fillTriangle(-30, 78, 30, 78, 0, 128);
    bg.lineStyle(6, boja(B.ink), 1);
    bg.strokeRoundedRect(-330, -110, 660, 190, 40);
    bg.lineBetween(-30, 80, 0, 128);
    bg.lineBetween(30, 80, 0, 128);
    bg.fillStyle(boja(B.card), 1);
    bg.fillRect(-27, 72, 54, 10);
    this.balonTekst = this.naslov(0, -15, "", 40, { align: "center", wordWrap: { width: 600 } }).setOrigin(0.5);
    this.balon.add([bg, this.balonTekst]);
    k.add(this.balon);

    this.dugmePrimi = new Dugme(this, 540, 960, 600, 130, "Primi porudžbinu", { boja: B.green, tekstBoja: "#fff", velicina: 44, tap: () => this.primi() });
    k.add(this.dugmePrimi);
  }

  private pozicijaURedu(i: number) {
    return { x: i === 0 ? 470 : 520 + i * 170, y: 870 - (i ? 14 : 0), s: i === 0 ? 1.12 : 0.92 };
  }

  private pozicijaCekanja(i: number) {
    return { x: 80 + i * 105, y: 846, s: 0.62 };
  }

  private gostUlazi(gost: M.Gost) {
    const slika = this.add.image(W + 220, 860, `gost-${gost.id}-neutralan`).setOrigin(0.5, 1);
    this.kasaGosti.add(slika);
    const pg: GostPogled = { gost, slika, dosao: this.t, raspolozenje: "neutralan", stigao: false };
    this.red.push(pg);
    this.sledeci++;
    this.zvono();
    this.rasporedi();
    this.osveziSve();
  }

  private zvono() {
    sfx.combo(8);
    this.time.delayedCall(140, () => sfx.combo(4));
  }

  /** Pomeri goste na mesta u redu i u čekaonici. */
  private rasporedi() {
    const idi = (pg: GostPogled, x: number, y: number, s: number) => {
      this.tweens.killTweensOf(pg.slika);
      const d = Math.abs(pg.slika.x - x);
      if (d < 2) {
        pg.slika.setPosition(x, y).setScale(s);
        pg.stigao = true;
        return;
      }
      pg.stigao = false;
      this.tweens.add({
        targets: pg.slika,
        x,
        y,
        scale: s,
        duration: this.mirno ? 200 : Math.min(1400, 300 + d * 1.4),
        ease: "Sine.InOut",
        onComplete: () => {
          pg.stigao = true;
          this.osveziKasu();
        },
      });
      if (!this.mirno) this.tweens.add({ targets: pg.slika, angle: { from: -3, to: 3 }, duration: 180, yoyo: true, repeat: Math.max(1, Math.round(d / 160)) });
    };
    this.red.forEach((pg, i) => {
      const p = this.pozicijaURedu(i);
      idi(pg, p.x, p.y, p.s);
    });
    this.cekaju.forEach((pg, i) => {
      const p = this.pozicijaCekanja(i);
      idi(pg, p.x, p.y, p.s);
    });
    // prvi u redu je ispred ostalih
    [...this.red].reverse().forEach((pg) => this.kasaGosti.bringToTop(pg.slika));
  }

  private narudzbinaTekst(g: M.Gost) {
    const pozdrav = ["Dobar dan!", "Zdravo!", "Ćao!", "Dobro jutro!"][g.id % 4];
    const mleko = g.mleko && g.mleko.id !== this.meni.mleka[0]?.id ? `, ${g.mleko.naziv.toLowerCase()} mleko` : "";
    return `${pozdrav} ${g.pice.naziv}${mleko}, molim.`;
  }

  private osveziKasu() {
    const prvi = this.red[0];
    const vidi = !!prvi && prvi.stigao;
    this.balon.setVisible(vidi);
    this.dugmePrimi.setVisible(vidi);
    if (prvi) this.balonTekst.setText(this.narudzbinaTekst(prvi.gost));
    this.tegla.setText(this.napojnice ? String(this.napojnice) : "");
  }

  private primi() {
    const pg = this.red.shift();
    if (!pg) return;
    const por: Porudzbina = { gost: pg.gost, n: M.noviNapitak(), pogled: pg, grupa: null, visoko: 0, nisko: 0, tacka: 0 };
    this.porudzbine.push(por);
    this.cekaju.push(pg);
    if (!this.aktivna) this.aktivna = por;
    sfx.ok();
    this.rasporedi();
    this.osveziSve();
  }

  // ---------- mlin ----------

  private mlinEkran!: Phaser.GameObjects.Text;
  private mlinCilj!: Phaser.GameObjects.Text;
  private mlinBroj!: Phaser.GameObjects.Text;
  private mlinKazaljka!: Phaser.GameObjects.Graphics;
  private mlinKafa!: Phaser.GameObjects.Graphics;
  private mlinPF!: Phaser.GameObjects.Image;
  private mlinTamper!: Phaser.GameObjects.Image;
  private mlinMerac!: Phaser.GameObjects.Graphics;
  private mlinKg!: Phaser.GameObjects.Text;
  private mlinPoruka!: Phaser.GameObjects.Text;
  private dMelji!: Dugme;
  private dTamp!: Dugme;
  private dIsprazni!: Dugme;
  private melje = false;
  private mlevenjeZvuk: { set(l: number, f?: number): void; stop(): void } | null = null;
  private zaostatak = 0;
  private tampuje = false;
  private pritisak = 0;
  private pfNaPodlozi = false;

  private gradiMlin() {
    const k = this.kont.mlin;
    k.add(this.add.image(0, 0, "zid").setOrigin(0));
    k.add(this.add.image(40, 10, "mlin").setOrigin(0));
    // podloga za tampovanje
    const pod = this.add.graphics();
    pod.fillStyle(boja(B.ink), 1);
    pod.fillRoundedRect(690, 980, 300, 22, 10);
    k.add(pod);
    k.add(this.tekst(300, 404, "DOZA", 22, { color: "#7cf0a9" }).setOrigin(0.5));
    this.mlinEkran = this.naslov(300, 448, "0,0 g", 62, { color: "#7cf0a9" }).setOrigin(0.5);
    this.mlinCilj = this.tekst(300, 490, "", 20, { color: "#7cf0a9" }).setOrigin(0.5);
    k.add([this.mlinEkran, this.mlinCilj]);
    this.mlinKazaljka = this.add.graphics();
    k.add(this.mlinKazaljka);
    this.mlinBroj = this.tekst(300, 519, "", 19, { color: B.bg }).setOrigin(0.5);
    k.add(this.mlinBroj);
    const minus = new Dugme(this, 160, 600, 80, 80, "−", { velicina: 46, tap: () => this.melji(-1) });
    const plus = new Dugme(this, 440, 600, 80, 80, "+", { velicina: 46, tap: () => this.melji(1) });
    k.add([minus, plus]);
    k.add(this.tekst(160, 662, "sitnije", 22, { color: B.chrome }).setOrigin(0.5));
    k.add(this.tekst(440, 662, "krupnije", 22, { color: B.chrome }).setOrigin(0.5));
    this.mlinKafa = this.add.graphics();
    this.mlinPF = this.add.image(MLIN_PF.x, MLIN_PF.y, "portafilter").setOrigin(0);
    this.mlinTamper = this.add.image(940, 980, "tamper").setOrigin(0.5, 1);
    k.add([this.mlinPF, this.mlinKafa, this.mlinTamper]);
    this.mlinMerac = this.add.graphics();
    this.mlinKg = this.naslov(990, 500, "", 34).setOrigin(0.5);
    k.add([this.mlinMerac, this.mlinKg]);
    this.mlinPoruka = this.tekst(540, 1290, "", 30, { color: B.ink, align: "center", wordWrap: { width: 980 } }).setOrigin(0.5);
    k.add(this.mlinPoruka);
    this.dMelji = new Dugme(this, 190, DUGMAD_Y, 340, 130, "Melji (drži)", { boja: B.yellow, velicina: 38, drzi: (d) => this.drziMelji(d) });
    this.dTamp = new Dugme(this, 560, DUGMAD_Y, 340, 130, "Tampuj (drži)", { boja: B.yellow, velicina: 38, drzi: (d) => this.drziTamp(d) });
    this.dIsprazni = new Dugme(this, 900, DUGMAD_Y, 280, 130, "Isprazni", { velicina: 38, tap: () => this.isprazni() });
    k.add([this.dMelji, this.dTamp, this.dIsprazni]);
  }

  private melji(korak: number) {
    this.granulacija = Math.max(1, Math.min(12, this.granulacija + korak));
    this.osveziMlin();
  }

  /** Porudžbina čiju kafu mlin sme da dira: aktivna, bez gotovog šota i bez portafiltera u aparatu. */
  private zaMlin(): Porudzbina | null {
    const p = this.aktivna;
    if (!p || p.n.sot || (p.grupa != null && this.grupe[p.grupa].por === p && this.grupe[p.grupa].pf)) return null;
    return p;
  }

  private drziMelji(dole: boolean) {
    const p = this.zaMlin();
    if (dole && p && p.n.tamp == null) {
      this.melje = true;
      p.n.granulacija = this.granulacija;
      this.mlevenjeZvuk = sfx.hiss(420, 0.6);
      this.mlevenjeZvuk.set(0.09, 420);
      this.zvuci.push(this.mlevenjeZvuk);
    } else if (!dole && this.melje) {
      this.melje = false;
      this.zaostatak = M.MLIN_ZAOSTATAK;
      this.mlevenjeZvuk?.stop();
      this.mlevenjeZvuk = null;
    }
  }

  private drziTamp(dole: boolean) {
    const p = this.zaMlin();
    if (dole && p && p.n.doza > 0 && p.n.tamp == null) {
      this.tampuje = true;
      this.pritisak = 0;
      this.postaviPF(true);
    } else if (!dole && this.tampuje) {
      this.tampuje = false;
      if (p) {
        p.n.tamp = Math.round(this.pritisak);
        const ok = p.n.tamp >= M.TAMP[0] && p.n.tamp <= M.TAMP[1];
        if (ok) sfx.ok();
        else sfx.bad();
        this.javi(ok ? `Tamp ${p.n.tamp} kg. Portafilter je spreman.` : p.n.tamp < M.TAMP[0] ? `Preslabo: ${p.n.tamp} kg.` : `Prejako: ${p.n.tamp} kg.`);
      }
      this.osveziSve();
    }
  }

  private isprazni() {
    const p = this.zaMlin();
    if (!p) return;
    p.n.doza = 0;
    p.n.tamp = null;
    p.n.granulacija = null;
    this.zaostatak = 0;
    sfx.swish();
    this.postaviPF(false);
    this.osveziSve();
  }

  private postaviPF(naPodlozi: boolean) {
    if (this.pfNaPodlozi === naPodlozi) return;
    this.pfNaPodlozi = naPodlozi;
    const { x, y } = naPodlozi ? PODLOGA_PF : MLIN_PF;
    this.tweens.killTweensOf(this.mlinPF);
    if (this.mirno) this.mlinPF.setPosition(x, y);
    else this.tweens.add({ targets: this.mlinPF, x, y, duration: 260, ease: "Sine.InOut" });
  }

  private osveziMlin() {
    const p = this.zaMlin();
    const a = Phaser.Math.DegToRad(-225 + ((this.granulacija - 1) / 11) * 270);
    this.mlinKazaljka.clear();
    this.mlinKazaljka.lineStyle(10, boja(B.ink), 1);
    this.mlinKazaljka.lineBetween(300 + Math.cos(a) * 14, 600 + Math.sin(a) * 14, 300 + Math.cos(a) * 58, 600 + Math.sin(a) * 58);
    this.mlinBroj.setText(`granulacija ${this.granulacija}`);
    const doza = p?.n.doza ?? 0;
    this.mlinEkran.setText(`${zarez(doza)} g`);
    this.mlinCilj.setText(p && this.vidiCilj(p) ? `cilj ${opseg(p.gost.pice.espreso.doza, " g")}` : "");
    this.postaviPF(!!p && (p.n.tamp != null || this.tampuje));
    this.mlinPF.setVisible(!!p || !this.aktivna);
    const sadrzaj = this.aktivna && !p;
    this.dMelji.postavi({ omogucen: !!p && p.n.tamp == null });
    this.dTamp.postavi({ omogucen: !!p && p.n.doza > 0 && p.n.tamp == null });
    this.dIsprazni.postavi({ omogucen: !!p && p.n.doza > 0 });
    this.mlinPoruka.setText(
      !this.aktivna
        ? "Izaberi porudžbinu na traci gore."
        : sadrzaj
          ? "Kafa za ovu porudžbinu je već u aparatu."
          : p!.n.tamp != null
            ? "Portafilter je spreman. Idi na Aparat."
            : p!.n.doza > 0
              ? "Kad je doza dobra, drži Tampuj i pusti kad je pritisak u zelenom."
              : "Drži Melji dok vaga ne pokaže dozu iz recepta.",
    );
  }

  private crtajMlin(dt: number) {
    const p = this.zaMlin();
    if (p && this.melje) p.n.doza += M.MLIN_GS * dt;
    if (p && this.zaostatak > 0) {
      const d = Math.min(this.zaostatak, dt * 1.2);
      p.n.doza += d;
      this.zaostatak -= d;
    }
    if (this.tampuje) this.pritisak = Math.min(35, this.pritisak + 16 * dt);
    if (this.stanica !== "mlin") return;
    const doza = p?.n.doza ?? 0;
    this.mlinEkran.setText(`${zarez(doza)} g`);
    const bx = this.mlinPF.x + PF_KORPA.x;
    const by = this.mlinPF.y + PF_KORPA.y;
    const g = this.mlinKafa;
    g.clear();
    const h = Math.min(56, (doza / 22) * 44);
    if (this.melje) {
      g.fillStyle(boja(B.coffee), 1);
      g.fillRect(295, 726, 10, Math.max(0, by - h - 726));
    }
    if (doza > 0 && this.mlinPF.visible) {
      g.fillStyle(boja(B.coffee), 1);
      g.lineStyle(4, boja(B.ink), 1);
      if (p?.n.tamp != null) {
        g.fillRect(bx - 42, by + 2, 84, 10);
        g.strokeRect(bx - 42, by + 2, 84, 10);
      } else {
        // kupa kafe iznad korpe raste sa dozom
        g.fillEllipse(bx, by + 4, 86, h * 2);
        g.strokeEllipse(bx, by + 4, 86, h * 2);
      }
    }
    // tamper stoji na podlozi; dok se tampuje, pritiska kafu u korpi
    const naPodlozi = this.pfNaPodlozi;
    if (this.tampuje) this.mlinTamper.setPosition(bx, by + 6 + (this.pritisak / 35) * 8);
    else this.mlinTamper.setPosition(940, 980);
    // merač pritiska
    const m = this.mlinMerac;
    m.clear();
    const prikazi = this.tampuje || (p?.n.tamp != null && naPodlozi);
    this.mlinKg.setVisible(!!prikazi);
    if (prikazi) {
      const val = this.tampuje ? this.pritisak : (p?.n.tamp ?? 0);
      const x = 960;
      const y0 = 540;
      const hh = 380;
      const yv = (v: number) => y0 + hh - (v / 35) * hh;
      m.fillStyle(boja(B.card), 1);
      m.fillRoundedRect(x, y0, 60, hh, 14);
      m.fillStyle(boja(B.mint), 1);
      m.fillRect(x, yv(M.TAMP[1]), 60, yv(M.TAMP[0]) - yv(M.TAMP[1]));
      m.fillStyle(boja(val >= M.TAMP[0] && val <= M.TAMP[1] ? B.green : val > M.TAMP[1] ? B.red : B.yellow), 1);
      m.fillRoundedRect(x + 12, yv(val), 36, y0 + hh - yv(val), 8);
      m.lineStyle(5, boja(B.ink), 1);
      m.strokeRoundedRect(x, y0, 60, hh, 14);
      this.mlinKg.setText(`${Math.round(val)} kg`).setPosition(x + 30, y0 - 34);
    }
  }

  // ---------- aparat ----------

  private aparatSolje!: Phaser.GameObjects.Container;
  private soljaNaPolici: Record<string, { x: number; y: number }> = {};
  private grupaUI: {
    solja: Phaser.GameObjects.Image;
    pf: Phaser.GameObjects.Image;
    mlaz: Phaser.GameObjects.Graphics;
    tecnost: Phaser.GameObjects.Graphics;
    vaga: Phaser.GameObjects.Text;
    ime: Phaser.GameObjects.Text;
    cilj: Phaser.GameObjects.Text;
    glavno: Dugme;
    tara: Dugme;
  }[] = [];

  private gradiAparat() {
    const k = this.kont.aparat;
    k.add(this.add.image(0, 0, "zid").setOrigin(0));
    k.add(this.add.image(40, APARAT_Y, "aparat").setOrigin(0));
    this.aparatSolje = this.add.container(0, 0);
    k.add(this.aparatSolje);
    // šolje stoje na grejaču na vrhu aparata, u istoj razmeri kao na vagi
    const n = this.meni.solje.length;
    this.meni.solje.forEach((s, i) => {
      const x = n === 1 ? 480 : 170 + (i * 700) / (n - 1);
      const img = this.add.image(x, APARAT_Y, `solja-${s.id}`).setOrigin(0.5, 1);
      img.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.uzmiSolju(s.id));
      this.aparatSolje.add(img);
      this.soljaNaPolici[s.id] = { x, y: APARAT_Y - img.height / 2 };
      k.add(this.tekst(x, APARAT_Y + 96, `${s.naziv}\n${s.ml} ml`, 20, { color: B.ink, align: "center", wordWrap: { width: 640 / n } }).setOrigin(0.5));
    });
    [330, 750].forEach((x, i) => {
      this.grupe.push({ x, por: null, pf: false, tece: false, t: 0, q: 0, kafa: 0, tara: 0, gotova: false, upozoren: false, hiss: null });
      const mlaz = this.add.graphics();
      const tecnost = this.add.graphics();
      const solja = this.add.image(x, RESETKA, "solja-" + this.meni.solje[0].id).setOrigin(0.5, 1).setVisible(false);
      const pf = this.add.image(x - PF_KORPA.x, GRUPA_DNO - PF_KORPA.y, "portafilter").setOrigin(0).setVisible(false);
      const tabla = this.add.graphics();
      tabla.fillStyle(boja(B.ink), 1);
      tabla.fillRoundedRect(x - 100, RESETKA + 6, 200, 40, 10);
      const vaga = this.tekst(x, RESETKA + 26, "", 26, { color: "#7cf0a9" }).setOrigin(0.5);
      const ime = this.naslov(x, 1044, "", 26).setOrigin(0.5);
      const cilj = this.tekst(x, 1074, "", 22, { color: B.caption }).setOrigin(0.5);
      const glavno = new Dugme(this, x, 1160, 390, 110, "", { boja: B.yellow, velicina: 36, tap: () => this.glavnoNaGrupi(i) });
      const tara = new Dugme(this, x, 1290, 390, 90, "Tara", { velicina: 34, tap: () => this.tariraj(i) });
      k.add([tecnost, solja, mlaz, pf, tabla, vaga, ime, cilj, glavno, tara]);
      this.grupaUI.push({ solja, pf, mlaz, tecnost, vaga, ime, cilj, glavno, tara });
    });
  }

  private uzmiSolju(id: string) {
    const p = this.aktivna;
    if (!p) return this.javi("Izaberi porudžbinu na traci.");
    if (p.n.sot) return this.javi("Espreso za ovo piće je gotov.");
    let gi = p.grupa;
    if (gi == null) {
      gi = this.grupe.findIndex((g) => !g.por && !g.gotova);
      if (gi < 0) return this.javi(this.grupe.some((g) => g.gotova) ? "Prvo očisti grupu." : "Obe grupe su zauzete.");
    }
    const g = this.grupe[gi];
    if (g.tece) return this.javi("Šot već teče.");
    sfx.tap();
    p.grupa = gi;
    g.por = p;
    p.n.solja = id;
    // druga šolja na vagi: stara tara više ne važi
    p.n.tara = false;
    g.tara = 0;
    this.osveziSve();
  }

  private tariraj(i: number) {
    const g = this.grupe[i];
    if (!g.por || g.tece) return;
    g.tara = this.masaNaVagi(g);
    g.por.n.tara = !!g.por.n.solja;
    sfx.tick();
    this.osveziSve();
  }

  private masaNaVagi(g: Grupa) {
    const s = g.por?.n.solja ? this.meni.solje.find((x) => x.id === g.por!.n.solja) : null;
    return (s?.g ?? 0) + g.kafa;
  }

  private glavnoNaGrupi(i: number) {
    const g = this.grupe[i];
    if (g.gotova) {
      // izbij talog i isperi grupu, da bude spremna za sledeći šot
      g.gotova = false;
      g.pf = false;
      g.por = null;
      g.kafa = 0;
      g.t = 0;
      g.tara = 0;
      g.upozoren = false;
      sfx.swish();
      this.osveziSve();
      return;
    }
    if (g.tece) return this.zaustavi(i);
    if (!g.pf) {
      const p = g.por ?? this.aktivna;
      if (p && !p.n.sot && g.gotova) return this.javi("Prvo očisti grupu.");
      if (!p || p.n.sot) return;
      if (p.grupa != null && p.grupa !== i) return this.javi("Ova porudžbina je na drugoj grupi.");
      if (p.n.tamp == null) return this.javi("Prvo samelji i tampuj kafu na mlinu.");
      p.grupa = i;
      g.por = p;
      g.pf = true;
      this.pfNaPodlozi = false;
      this.mlinPF.setPosition(MLIN_PF.x, MLIN_PF.y);
      sfx.tick();
      this.osveziSve();
      return;
    }
    if (!g.por?.n.solja) return this.javi("Stavi šolju na vagu.");
    g.tece = true;
    g.t = 0;
    g.kafa = 0;
    g.q = M.protok(g.por.n.doza, g.por.n.granulacija ?? this.granulacija, this.idealna, g.por.n.tamp);
    g.hiss = sfx.hiss(300, 1.2);
    g.hiss.set(0.035, 300);
    this.osveziSve();
  }

  private zaustavi(i: number) {
    const g = this.grupe[i];
    if (!g.tece || !g.por) return;
    g.tece = false;
    g.gotova = true;
    g.hiss?.stop();
    g.hiss = null;
    const p = g.por;
    p.n.sot = { g: g.kafa, s: g.t };
    // šolja odmah ide na šank; grupa ostaje sa talogom dok se ne očisti
    const ui = this.grupaUI[i];
    if (this.stanica === "aparat" && ui.solja.visible && !this.mirno) {
      const leti = this.add.image(ui.solja.x, ui.solja.y + VRH, ui.solja.texture.key).setOrigin(0.5, 1).setDepth(5);
      this.tweens.add({ targets: leti, y: leti.y - 160, alpha: 0, duration: 450, ease: "Sine.In", onComplete: () => leti.destroy() });
    }
    g.por = null;
    g.tara = 0;
    const pr = M.uOpsegu(g.kafa, p.gost.pice.espreso.prinos, 6);
    const vr = M.uOpsegu(g.t, p.gost.pice.espreso.vreme, 6);
    if (pr > 0.99 && vr > 0.99) sfx.ok();
    else sfx.bad();
    this.javi(
      vr < 0.99
        ? g.t < p.gost.pice.espreso.vreme[0]
          ? `${Math.round(g.t)} s: prebrzo. Melji sitnije.`
          : `${Math.round(g.t)} s: presporo. Melji krupnije.`
        : `${zarez(g.kafa)} g za ${Math.round(g.t)} s.`,
    );
    this.osveziSve();
  }

  private osveziAparat() {
    this.grupe.forEach((g, i) => {
      const ui = this.grupaUI[i];
      const p = g.por;
      ui.solja.setVisible(!!p?.n.solja);
      if (p?.n.solja) ui.solja.setTexture(`solja-${p.n.solja}`);
      ui.pf.setVisible(g.pf);
      ui.ime.setText(p ? `${p.gost.pice.naziv} · ${p.gost.ime}` : g.gotova ? "Talog u grupi" : "");
      ui.cilj.setText(p && this.vidiCilj(p) ? `cilj ${opseg(p.gost.pice.espreso.prinos, " g")} za ${opseg(p.gost.pice.espreso.vreme, " s")}` : "");
      let tekst = "Ubaci portafilter";
      let ok = false;
      let bojaD = B.yellow;
      if (g.gotova) {
        tekst = "Očisti grupu";
        ok = true;
        bojaD = B.card;
      } else if (g.tece) {
        tekst = "Stop";
        ok = true;
        bojaD = B.red;
      } else if (g.pf) {
        tekst = p?.n.solja ? "Start" : "Stavi šolju";
        ok = !!p?.n.solja;
        bojaD = B.green;
      } else {
        const kand = p ?? this.aktivna;
        ok = !!kand && !kand.n.sot && kand.n.tamp != null && (kand.grupa == null || kand.grupa === i);
      }
      ui.glavno.postavi({ tekst, omogucen: ok, boja: bojaD, tekstBoja: bojaD === B.red || bojaD === B.green ? "#fff" : B.ink });
      ui.tara.postavi({ omogucen: !!p?.n.solja && !g.tece && !g.gotova });
    });
  }

  private korakAparata(dt: number) {
    this.grupe.forEach((g, i) => {
      if (g.tece && g.por) {
        g.t += dt;
        g.kafa = M.prinosPosle(g.t, g.q);
        const max = g.por.gost.pice.espreso.prinos[1];
        if (!g.upozoren && g.kafa > max + 4) {
          g.upozoren = true;
          sfx.bad();
          if (this.stanica !== "aparat") this.javi("Šot curi predugo!");
        }
        if (g.t >= 90) this.zaustavi(i);
      }
      if (this.stanica !== "aparat") return;
      const ui = this.grupaUI[i];
      const vaga = g.por?.n.solja || g.kafa ? this.masaNaVagi(g) - g.tara : 0;
      ui.vaga.setText(`${zarez(vaga)} g · ${Math.floor(g.t)} s`);
      ui.mlaz.clear();
      ui.tecnost.clear();
      const s = g.por?.n.solja ? this.meni.solje.find((x) => x.id === g.por!.n.solja) : null;
      if (s && g.kafa > 0) {
        // u čaši se vidi espreso kako raste (u šolji ga krije porcelan)
        const v = C.velicinaSolje(s);
        const nivo = Math.min(1, (g.kafa * M.ML_PO_G) / s.ml) * (v.telo - 8);
        ui.tecnost.fillStyle(boja(B.coffee), 1);
        ui.tecnost.fillRect(g.x - v.sir / 2 + 6, RESETKA - 12 - nivo, v.sir - 12, nivo);
        ui.tecnost.fillStyle(boja(B.crema), 1);
        ui.tecnost.fillRect(g.x - v.sir / 2 + 6, RESETKA - 12 - nivo, v.sir - 12, Math.min(nivo, 6));
      }
      if (g.tece && g.t > M.KASNJENJE) {
        const vrh = RESETKA - ui.solja.displayHeight + 8;
        const deb = Math.min(6, 2 + (g.t - M.KASNJENJE) * 1.5);
        const od = GRUPA_DNO - PF_KORPA.y + 72;
        ui.mlaz.fillStyle(boja(B.coffee), 1);
        ui.mlaz.fillRect(g.x - 13 - deb / 2, od, deb, vrh - od);
        ui.mlaz.fillRect(g.x + 13 - deb / 2, od, deb, vrh - od);
      }
    });
  }

  // ---------- mleko ----------

  private latijeraSl!: Phaser.GameObjects.Image;
  private mlekoNivo!: Phaser.GameObjects.Graphics;
  private termometar!: Phaser.GameObjects.Image;
  private kazaljka!: Phaser.GameObjects.Graphics;
  private mlekoMeraci!: Phaser.GameObjects.Graphics;
  private mlekoOdozgo!: Phaser.GameObjects.Graphics;
  private mlekoMl!: Phaser.GameObjects.Text;
  private mlekoTemp!: Phaser.GameObjects.Text;
  private mlekoPoruka!: Phaser.GameObjects.Text;
  private tetrapaci: { id: string; slika: Phaser.GameObjects.Image; okvir: Phaser.GameObjects.Graphics; natpis: Phaser.GameObjects.Text }[] = [];
  private paraCestice!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dSipajMleko!: Dugme;
  private dPara!: Dugme;
  private dProspi!: Dugme;
  private para = false;
  private paraZvuk: { set(l: number, f?: number): void; stop(): void } | null = null;
  private sipaMleko = false;
  private latY = 750;
  /** položaj vrha stimera sa klizača: -1,2 iznad površine … +1,2 duboko */
  private zeljenaDubina = -0.05;
  private vuce = false;
  private vrtlog = 0;
  private klizac!: Phaser.GameObjects.Container;
  private klizacRucka!: Phaser.GameObjects.Graphics;
  private sipaTetrapak: { slika: Phaser.GameObjects.Image; x: number; y: number } | null = null;

  /** Vrh stimera je na (600, 520) lokalno; latijera visi tako da je vrh u njoj. */
  private static readonly VRH_X = 600;
  private static readonly VRH_Y = 520;
  private static readonly LAT_X = 500;

  private gradiMleko() {
    const k = this.kont.mleko;
    k.add(this.add.image(0, 0, "zid").setOrigin(0));
    const panel = this.add.graphics();
    panel.fillStyle(boja(B.ink), 1);
    panel.fillRoundedRect(718, -10, 380, 280, 24);
    panel.fillStyle(boja(B.pink), 1);
    panel.fillRoundedRect(710, -20, 380, 280, 24);
    panel.lineStyle(6, boja(B.ink), 1);
    panel.strokeRoundedRect(710, -20, 380, 280, 24);
    panel.fillStyle(boja(B.green), 1);
    panel.fillRect(710, 30, 380, 24);
    panel.strokeRect(710, 30, 380, 24);
    k.add(panel);
    if (this.textures.exists("znak")) k.add(this.add.image(205, 300, "znak").setDisplaySize(230, 230));
    // tetrapaci stoje na pultu pored stimera, kao za pravim šankom
    this.meni.mleka.slice(0, 3).forEach((m, i) => {
      const x = 85 + i * 125;
      const okvir = this.add.graphics();
      const slika = this.add.image(x, PLOCA, `mleko-${m.id}`).setOrigin(0.5, 1);
      slika.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.izaberiMleko(m.id));
      const natpis = this.tekst(x, PLOCA - 115, m.naziv, 20, { align: "center", wordWrap: { width: 88 } }).setOrigin(0.5);
      k.add([okvir, slika, natpis]);
      this.tetrapaci.push({ id: m.id, slika, okvir, natpis });
    });
    this.gradiKlizac(k);
    this.paraCestice = this.add.particles(Smena.VRH_X, Smena.VRH_Y - 10, "para", {
      speed: { min: 60, max: 160 },
      angle: { min: 230, max: 310 },
      lifespan: 900,
      scale: { start: 0.6, end: 2.2 },
      alpha: { start: 0.55, end: 0 },
      frequency: 60,
      emitting: false,
    });
    this.latijeraSl = this.add.image(Smena.LAT_X, this.latY, "latijera").setOrigin(0);
    this.mlekoNivo = this.add.graphics();
    k.add([this.latijeraSl, this.mlekoNivo, this.add.image(560, 0, "stimer").setOrigin(0), this.paraCestice]);
    this.mlekoMl = this.naslov(Smena.LAT_X + 100, 900, "", 28, { backgroundColor: B.card, padding: { x: 10, y: 4 } }).setOrigin(0.5);
    k.add(this.mlekoMl);
    this.termometar = this.add.image(900, 330, `term-${this.pica.find((p) => p.mleko)?.mleko!.temp.join("-") ?? "55-65"}`).setOrigin(0.5, 160 / 300);
    this.kazaljka = this.add.graphics();
    this.mlekoTemp = this.naslov(900, 497, "", 32).setOrigin(0.5);
    this.mlekoMeraci = this.add.graphics();
    this.mlekoOdozgo = this.add.graphics();
    k.add([this.termometar, this.kazaljka, this.mlekoTemp, this.mlekoMeraci, this.mlekoOdozgo]);
    ["Pena", "Spajanje", "Krupni mehurići"].forEach((s, i) => k.add(this.tekst(770, 520 + i * 90, s, 26)));
    k.add(this.tekst(915, 978, "pogled odozgo", 20, { color: B.caption }).setOrigin(0.5));
    this.mlekoPoruka = this.tekst(540, 1290, "", 30, { align: "center", wordWrap: { width: 980 } }).setOrigin(0.5);
    k.add(this.mlekoPoruka);
    this.dSipajMleko = new Dugme(this, 190, DUGMAD_Y, 340, 130, "Sipaj (drži)", { boja: B.yellow, velicina: 38, drzi: (d) => this.drziSipajMleko(d) });
    this.dPara = new Dugme(this, 560, DUGMAD_Y, 340, 130, "Para", { boja: B.green, tekstBoja: "#fff", velicina: 40, tap: () => this.prekidacPare() });
    this.dProspi = new Dugme(this, 900, DUGMAD_Y, 280, 130, "Prospi", { velicina: 38, tap: () => this.prospi() });
    k.add([this.dSipajMleko, this.dPara, this.dProspi]);
  }

  /** Klizač: gde je vrh stimera u odnosu na površinu mleka. Gore je iznad (krupni mehurići), dole duboko (vrtlog). */
  private static readonly KL = { x: 440, gore: 250, dole: 850 };

  private dubinaZaY(y: number) {
    const { gore, dole } = Smena.KL;
    return -1.2 + ((Phaser.Math.Clamp(y, gore, dole) - gore) / (dole - gore)) * 2.4;
  }

  private yZaDubinu(d: number) {
    const { gore, dole } = Smena.KL;
    return gore + ((Phaser.Math.Clamp(d, -1.2, 1.2) + 1.2) / 2.4) * (dole - gore);
  }

  private gradiKlizac(k: Phaser.GameObjects.Container) {
    const { x, gore, dole } = Smena.KL;
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    const zone: [number, number, string, string][] = [
      [-1.2, -0.3, B.redL, "IZNAD"],
      [-0.3, 0.2, B.yellowL, "POVRŠINA"],
      [0.2, 1.2, B.mint, "DUBOKO"],
    ];
    g.fillStyle(boja(B.ink), 1);
    g.fillRoundedRect(x - 30 + 6, gore - 10 + 6, 60, dole - gore + 20, 30);
    for (const [a, b, bo] of zone) {
      g.fillStyle(boja(bo), 1);
      g.fillRect(x - 30, this.yZaDubinu(a), 60, this.yZaDubinu(b) - this.yZaDubinu(a));
    }
    g.lineStyle(5, boja(B.ink), 1);
    g.strokeRoundedRect(x - 30, gore - 10, 60, dole - gore + 20, 30);
    c.add(g);
    for (const [a, b, , natpis] of zone) {
      c.add(this.tekst(x, (this.yZaDubinu(a) + this.yZaDubinu(b)) / 2, natpis, 19, { color: B.ink }).setOrigin(0.5).setAngle(-90));
    }
    c.add(this.tekst(x, gore - 40, "VRH", 22).setOrigin(0.5));
    this.klizacRucka = this.add.graphics();
    c.add(this.klizacRucka);
    const zona = this.add.rectangle(x, (gore + dole) / 2, 150, dole - gore + 80, 0, 0).setInteractive({ useHandCursor: true });
    c.add(zona);
    const postavi = (pt: Phaser.Input.Pointer) => {
      this.zeljenaDubina = this.dubinaZaY(pt.y - VRH);
    };
    zona.on("pointerdown", (pt: Phaser.Input.Pointer) => {
      if (!this.para) return this.javi("Prvo uključi paru.");
      this.vuce = true;
      postavi(pt);
    });
    this.input.on("pointermove", (pt: Phaser.Input.Pointer) => this.vuce && this.para && postavi(pt));
    this.input.on("pointerup", () => (this.vuce = false));
    this.klizac = c;
    k.add(c);
  }

  private zaMleko(): Porudzbina | null {
    const p = this.aktivna;
    return p && p.gost.pice.mleko && p.n.sipano === 0 ? p : null;
  }

  private izaberiMleko(id: string) {
    const p = this.zaMleko();
    if (!p) return this.javi(this.aktivna ? "Ovo piće je bez mleka." : "Izaberi porudžbinu na traci.");
    if (p.n.mleko && p.n.mleko.ml > 0 && p.n.mleko.vrsta !== id) return this.javi("U latijeri je drugo mleko. Prvo ga prospi.");
    sfx.tap();
    if (!p.n.mleko || p.n.mleko.ml === 0) p.n.mleko = M.novoMleko(id);
    this.osveziSve();
  }

  private drziSipajMleko(dole: boolean) {
    const p = this.zaMleko();
    this.sipaMleko = dole && !!p?.n.mleko && !this.para && p.n.mleko.temp < 20;
    // izabrani tetrapak se nagne iznad latijere dok se sipa
    const t = this.tetrapaci.find((x) => x.id === p?.n.mleko?.vrsta);
    if (this.sipaMleko && t && !this.sipaTetrapak) {
      this.sipaTetrapak = { slika: t.slika, x: t.slika.x, y: t.slika.y };
      t.natpis.setVisible(false);
      this.kont.mleko.bringToTop(t.slika);
      this.tweens.killTweensOf(t.slika);
      this.tweens.add({ targets: t.slika, x: Smena.LAT_X + 300, y: 520, angle: -118, duration: this.mirno ? 1 : 220, ease: "Sine.Out" });
    } else if (!this.sipaMleko && this.sipaTetrapak) {
      const { slika, x, y } = this.sipaTetrapak;
      this.sipaTetrapak = null;
      this.tweens.killTweensOf(slika);
      this.tweens.add({
        targets: slika,
        x,
        y,
        angle: 0,
        duration: this.mirno ? 1 : 220,
        ease: "Sine.In",
        onComplete: () => this.tetrapaci.forEach((tp) => tp.natpis.setVisible(true)),
      });
    }
  }

  private prekidacPare() {
    const p = this.zaMleko();
    if (!p?.n.mleko || p.n.mleko.ml < 40) return this.javi("Prvo sipaj mleko u latijeru.");
    if (this.para) return this.paraIskljuci();
    if (p.n.mleko.pregorelo) return this.javi("Mleko je pregorelo. Prospi ga.");
    this.para = true;
    // latijera ide pod stimer, vrh na površini: odatle počinje ubacivanje vazduha
    this.zeljenaDubina = -0.05;
    this.latY = this.latijeraZaDubinu(p.n.mleko.ml, this.zeljenaDubina);
    this.paraZvuk = sfx.hiss(2600, 0.6);
    this.zvuci.push(this.paraZvuk);
    this.paraCestice.start();
    this.osveziSve();
  }

  private paraIskljuci() {
    this.sipaMleko = false;
    if (!this.para) return;
    this.para = false;
    this.vuce = false;
    this.paraZvuk?.stop();
    this.paraZvuk = null;
    this.paraCestice?.stop();
    this.latY = 750;
    this.osveziSve();
  }

  private prospi() {
    const p = this.zaMleko();
    if (!p) return;
    this.paraIskljuci();
    p.n.mleko = null;
    sfx.swish();
    this.osveziSve();
  }

  /** y površine mleka u latijeri (lokalno u slici latijere) za ml mleka; latijera prima 350 ml. */
  private povrsina(ml: number) {
    return 236 - (Math.min(350, ml) / 350) * 190;
  }

  private dubina(ml: number) {
    return (Smena.VRH_Y - this.latY - this.povrsina(ml)) / 45;
  }

  /** y latijere za željenu dubinu vrha (latijera se ne penje preko stimera ni ne pada ispod njega). */
  private latijeraZaDubinu(ml: number, d: number) {
    return Phaser.Math.Clamp(Smena.VRH_Y - this.povrsina(ml) - d * 45, Smena.VRH_Y - 225, Smena.VRH_Y - 10);
  }

  private osveziMleko() {
    const p = this.zaMleko();
    const m = p?.n.mleko;
    for (const t of this.tetrapaci) {
      t.okvir.clear();
      if (m?.vrsta === t.id && !this.sipaTetrapak) {
        t.okvir.lineStyle(8, boja(B.green), 1);
        t.okvir.strokeRoundedRect(t.slika.x - 62, PLOCA - 310, 124, 318, 16);
      }
    }
    this.klizac.setAlpha(this.para ? 1 : 0.45);
    const pice = p?.gost.pice;
    if (pice?.mleko && this.textures.exists(`term-${pice.mleko.temp.join("-")}`)) this.termometar.setTexture(`term-${pice.mleko.temp.join("-")}`);
    this.dSipajMleko.postavi({ omogucen: !!m && !this.para && m.temp < 20 });
    this.dPara.postavi({ omogucen: !!m && m.ml >= 40, tekst: this.para ? "Isključi paru" : "Para", boja: this.para ? B.red : B.green });
    this.dProspi.postavi({ omogucen: !!m });
    if (!this.para) this.mlekoPoruka.setText(this.porukaMleka(p));
  }

  private porukaMleka(p: Porudzbina | null) {
    if (!this.aktivna) return "Izaberi porudžbinu na traci gore.";
    if (!this.aktivna.gost.pice.mleko) return "Ovo piće je bez mleka.";
    if (!p) return "Mleko za ovo piće je već u šolji.";
    const m = p.n.mleko;
    if (!m) return `Gost traži ${p.gost.mleko?.naziv.toLowerCase() ?? ""} mleko. Tapni taj tetrapak.`;
    if (m.ml === 0) return "Drži Sipaj da sipaš mleko u latijeru.";
    if (m.temp < 20) return "Kad je dosta mleka, uključi paru.";
    if (m.pregorelo) return "Pregorelo. Prospi i sipaj novo mleko.";
    return "Mleko je spremno. Idi na Šank.";
  }

  private korakMleka(dt: number) {
    const p = this.zaMleko();
    const m = p?.n.mleko;
    if (this.sipaMleko && m) m.ml = Math.min(350, m.ml + 90 * dt);
    if (this.para && m) {
      // latijera prati klizač
      this.latY += (this.latijeraZaDubinu(m.ml, this.zeljenaDubina) - this.latY) * Math.min(1, dt * 12);
      const d = this.dubina(m.ml);
      M.korakPare(m, d, dt);
      const vrh = M.vrhZa(d);
      this.paraZvuk?.set(vrh === "iznad" ? 0.07 : vrh === "povrsina" ? 0.045 : 0.02, vrh === "iznad" ? 4200 : vrh === "povrsina" ? 2600 : 600);
      this.paraCestice.setFrequency(vrh === "iznad" ? 25 : vrh === "povrsina" ? 50 : 120);
      if (vrh === "duboko") this.vrtlog += dt * 6;
      this.mlekoPoruka.setText(
        vrh === "iznad"
          ? "Vrh je iznad mleka: krupni mehurići! Pomeri klizač na POVRŠINA."
          : vrh === "povrsina"
            ? m.pena < PENA_OPSEG[p!.gost.pice.mleko!.pena][0]
              ? "Vrh na površini: ulazi vazduh i pena raste."
              : "Dosta pene. Pomeri klizač na DUBOKO za vrtlog."
            : m.pena < 0.04
              ? "Potopljeno, ali bez vazduha nema pene."
              : "Vrtlog spaja penu i mleko. Pazi na temperaturu.",
      );
      if (m.pregorelo) {
        sfx.bad();
        this.javi("Pregorelo! Mleko preko 75 °C.");
        this.paraIskljuci();
      }
    } else if (!this.para && this.stanica === "mleko") {
      // latijera se vraća na pult
      this.latY += (750 - this.latY) * Math.min(1, dt * 10);
    }
    if (this.stanica !== "mleko") return;
    this.latijeraSl.setY(this.latY).setVisible(!!m || !!p);
    const n = this.mlekoNivo;
    n.clear();
    const cilj = p && this.vidiCilj(p) && p.gost.pice.mleko ? ` / ${opseg(p.gost.pice.mleko.ml)}` : "";
    this.mlekoMl
      .setText(m && m.ml > 0 ? `${Math.round(m.ml)}${cilj} ml` : "")
      .setVisible(!!m && m.ml > 0)
      .setPosition(Smena.LAT_X + 100, this.latY + 196);
    // ručka klizača pokazuje gde je vrh zaista (latijera ne može preko svojih ivica)
    const kr = this.klizacRucka;
    kr.clear();
    const dPrikaz = this.para && m ? this.dubina(m.ml) : this.zeljenaDubina;
    const hy = this.yZaDubinu(dPrikaz);
    kr.fillStyle(boja(B.ink), 1);
    kr.fillCircle(Smena.KL.x + 4, hy + 4, 34);
    kr.fillStyle(boja(B.card), 1);
    kr.fillCircle(Smena.KL.x, hy, 34);
    kr.lineStyle(5, boja(B.ink), 1);
    kr.strokeCircle(Smena.KL.x, hy, 34);
    kr.lineBetween(Smena.KL.x - 16, hy, Smena.KL.x + 16, hy);
    // mlaz iz tetrapaka
    if (this.sipaMleko && this.sipaTetrapak && m) {
      n.fillStyle(boja(B.milk), 1);
      n.fillRect(Smena.LAT_X + 30, 662, 14, Math.max(0, this.latY + this.povrsina(m.ml) - 662));
    }
    // kazaljka termometra
    const temp = m?.temp ?? 5;
    const a = Math.PI * (0.75 + (Math.min(80, temp) / 80) * 1.5);
    this.kazaljka.clear();
    this.kazaljka.lineStyle(10, boja(B.red), 1);
    this.kazaljka.lineBetween(900, 330, 900 + Math.cos(a) * 100, 330 + Math.sin(a) * 100);
    this.kazaljka.fillStyle(boja(B.ink), 1);
    this.kazaljka.fillCircle(900, 330, 14);
    this.mlekoTemp.setText(m ? `${Math.round(temp)} °C` : "");
    // merači
    const g = this.mlekoMeraci;
    g.clear();
    const traka = (i: number, v: number, zona: [number, number] | null, bojaT: string) => {
      const y = 556 + i * 90;
      g.fillStyle(boja(B.card), 1);
      g.fillRoundedRect(770, y, 290, 28, 14);
      if (zona) {
        g.fillStyle(boja(B.mint), 1);
        g.fillRect(770 + zona[0] * 290, y, (zona[1] - zona[0]) * 290, 28);
      }
      g.fillStyle(boja(bojaT), 1);
      if (v > 0.01) g.fillRoundedRect(774, y + 5, Math.max(18, v * 282), 18, 9);
      g.lineStyle(4, boja(B.ink), 1);
      g.strokeRoundedRect(770, y, 290, 28, 14);
    };
    const pz = p?.gost.pice.mleko ? PENA_OPSEG[p.gost.pice.mleko.pena] : null;
    traka(0, m?.pena ?? 0, pz, B.yellow);
    traka(1, m?.spojeno ?? 0, [0.6, 1], B.green);
    traka(2, m?.mehurici ?? 0, [0, 0.25], B.red);
    // pogled odozgo: pena, mehurići, vrtlog
    const o = this.mlekoOdozgo;
    o.clear();
    o.fillStyle(boja(B.chrome), 1);
    o.fillCircle(915, 880, 82);
    o.lineStyle(5, boja(B.ink), 1);
    o.strokeCircle(915, 880, 82);
    if (m && m.ml > 0) {
      o.fillStyle(boja(m.pena > 0.1 ? "#fffdf7" : B.milk), 1);
      o.fillCircle(915, 880, 68);
      o.fillStyle(boja(B.line), 1);
      const tacke = Math.round(m.pena * 40);
      for (let i = 0; i < tacke; i++) {
        const ug = i * 2.4 + this.vrtlog;
        const r = 12 + ((i * 37) % 60);
        o.fillCircle(915 + Math.cos(ug) * r * 0.85, 880 + Math.sin(ug) * r * 0.85, 3);
      }
      o.lineStyle(3, boja(B.chromeD), 1);
      for (let i = 0; i < Math.round(m.mehurici * 12); i++) {
        const ug = i * 1.9 + this.vrtlog * 0.5;
        const r = 20 + ((i * 23) % 50);
        o.strokeCircle(915 + Math.cos(ug) * r * 0.85, 880 + Math.sin(ug) * r * 0.85, 7 + (i % 3) * 3);
      }
      if (this.para && M.vrhZa(this.dubina(m.ml)) === "duboko") {
        o.lineStyle(4, boja(B.chromeD), 0.7);
        for (let i = 0; i < 3; i++) {
          o.beginPath();
          o.arc(915, 880, 24 + i * 15, this.vrtlog + i, this.vrtlog + i + 1.6);
          o.strokePath();
        }
      }
    }
    // nivo mleka se vidi kroz kljun kao bela linija na vrhu
    if (m && m.ml > 0) {
      n.fillStyle(boja(B.milk), 1);
      const y = this.latY + this.povrsina(m.ml);
      n.fillRect(Smena.LAT_X + 34, y - 4, 138, 8);
    }
  }

  // ---------- šank ----------

  private sankSolja!: Phaser.GameObjects.Graphics;
  private sankLatijera!: Phaser.GameObjects.Image;
  private sankMlaz!: Phaser.GameObjects.Graphics;
  private sankNivo!: Phaser.GameObjects.Graphics;
  private sankNivoTekst!: Phaser.GameObjects.Text;
  private sankPoruka!: Phaser.GameObjects.Text;
  private dSipaj!: Dugme;
  private dVisina!: Dugme;
  private dPosluzi!: Dugme;
  private sipa = false;
  private nisko = false;
  private sipaZvuk: { set(l: number, f?: number): void; stop(): void } | null = null;

  private gradiSank() {
    const k = this.kont.sank;
    k.add(this.add.image(0, 0, "sank").setOrigin(0));
    this.sankSolja = this.add.graphics();
    this.sankMlaz = this.add.graphics();
    this.sankLatijera = this.add.image(800, 260, "latijera").setOrigin(0.1, 0.15).setVisible(false);
    this.sankNivo = this.add.graphics();
    this.sankNivoTekst = this.naslov(540, 930, "", 32).setOrigin(0.5);
    this.sankPoruka = this.tekst(540, 1290, "", 30, { align: "center", wordWrap: { width: 980 } }).setOrigin(0.5);
    k.add([this.sankSolja, this.sankMlaz, this.sankLatijera, this.sankNivo, this.sankNivoTekst, this.sankPoruka]);
    this.dSipaj = new Dugme(this, 190, DUGMAD_Y, 340, 130, "Sipaj (drži)", { boja: B.yellow, velicina: 38, drzi: (d) => this.drziSipaj(d) });
    this.dVisina = new Dugme(this, 560, DUGMAD_Y, 340, 130, "Spusti latijeru", { velicina: 34, tap: () => this.promeniVisinu() });
    this.dPosluzi = new Dugme(this, 900, DUGMAD_Y, 280, 130, "Posluži", { boja: B.green, tekstBoja: "#fff", velicina: 40, tap: () => this.posluzi() });
    k.add([this.dSipaj, this.dVisina, this.dPosluzi]);
  }

  /** Espreso ide na šank čim se šot zaustavi. */
  private naSanku(p: Porudzbina | null) {
    return !!p?.n.sot;
  }

  private drziSipaj(dole: boolean) {
    const p = this.aktivna;
    const moze = this.naSanku(p) && !!p!.n.mleko && p!.n.mleko.ml - p!.n.sipano > 1;
    if (dole && moze) {
      this.sipa = true;
      this.sipaZvuk = sfx.hiss(900, 0.8);
      this.sipaZvuk.set(0.03, 900);
      this.zvuci.push(this.sipaZvuk);
    } else if (!dole && this.sipa) {
      this.sipa = false;
      this.sipaZvuk?.stop();
      this.sipaZvuk = null;
    }
  }

  private promeniVisinu() {
    this.nisko = !this.nisko;
    this.osveziSank();
  }

  private soljaAktivne() {
    const p = this.aktivna;
    return p?.n.solja ? this.meni.solje.find((s) => s.id === p.n.solja) ?? null : null;
  }

  /** Popunjenost šolje (0–1+) iz espresa i sipanog mleka. */
  private popunjenost(p: Porudzbina) {
    const cap = this.soljaAktivne()?.ml ?? 200;
    return ((p.n.sot?.g ?? 0) * M.ML_PO_G + M.zapreminaMleka(p.n.sipano, p.n.mleko?.pena ?? 0)) / cap;
  }

  private korakSanka(dt: number) {
    const p = this.aktivna;
    if (this.sipa && p?.n.mleko) {
      const ostalo = p.n.mleko.ml - p.n.sipano;
      // brzina sipanja prati veličinu šolje, pa je prozor za "puno" isti za kortado i za late
      const cap = this.soljaAktivne()?.ml ?? 180;
      const ml = Math.min(ostalo, cap * (this.nisko ? 0.18 : 0.3) * dt);
      p.n.sipano += ml;
      if (this.nisko) {
        p.nisko += ml;
        if (p.n.mleko.pena > 0.08) p.tacka = Math.sqrt(p.nisko) * 9;
      } else p.visoko += ml;
      if (ostalo - ml <= 1) this.drziSipaj(false);
    }
    if (this.stanica === "sank") this.crtajSank();
  }

  private crtajSank() {
    const p = this.aktivna;
    const g = this.sankSolja;
    g.clear();
    this.sankMlaz.clear();
    this.sankNivo.clear();
    const s = this.soljaAktivne();
    const naSanku = this.naSanku(p);
    this.sankLatijera.setVisible(naSanku && !!p?.n.mleko && p.n.mleko.ml - p.n.sipano > 1);
    if (!p || !naSanku || !s) {
      this.sankNivoTekst.setText("");
      return;
    }
    const cx = 500;
    const cy = 500;
    const R = Phaser.Math.Clamp(150 + ((s.ml - 60) / 240) * 90, 140, 240);
    // tacna
    g.fillStyle(boja(B.ink), 1);
    g.fillCircle(cx + 10, cy + 10, R + 90);
    g.fillStyle(boja(B.card), 1);
    g.fillCircle(cx, cy, R + 90);
    g.lineStyle(6, boja(B.ink), 1);
    g.strokeCircle(cx, cy, R + 90);
    g.lineStyle(3, boja(B.line), 1);
    g.strokeCircle(cx, cy, R + 50);
    // drška
    g.fillStyle(boja(s.oblik === "casa" ? B.blueL : B.card), 1);
    if (s.oblik !== "casa") {
      g.fillRoundedRect(cx + R - 10, cy - 34, 110, 68, 30);
      g.lineStyle(6, boja(B.ink), 1);
      g.strokeRoundedRect(cx + R - 10, cy - 34, 110, 68, 30);
    }
    // šolja
    g.fillStyle(boja(s.oblik === "casa" ? B.blueL : B.card), 1);
    g.fillCircle(cx, cy, R);
    g.lineStyle(6, boja(B.ink), 1);
    g.strokeCircle(cx, cy, R);
    // tečnost: krema espresa, sa mlekom svetlija
    const pun = this.popunjenost(p);
    const rt = (R - 18) * (0.5 + 0.5 * Math.min(1, pun));
    const udeo = p.n.sipano > 0 ? k01(p.visoko / Math.max(1, p.n.sipano + (p.n.sot!.g || 1))) : 0;
    const bojaT = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(boja(B.crema)),
      Phaser.Display.Color.ValueToColor(0xc79d72),
      100,
      Math.round(udeo * 100),
    );
    g.fillStyle(Phaser.Display.Color.GetColor(bojaT.r, bojaT.g, bojaT.b), 1);
    g.fillCircle(cx, cy, rt);
    g.lineStyle(10, boja(B.coffee), 0.35);
    g.strokeCircle(cx, cy, rt - 5);
    if (pun > 1.02) {
      g.fillStyle(boja(B.crema), 0.8);
      g.fillCircle(cx - R * 0.7, cy + R * 0.75, 40);
      g.fillCircle(cx - R * 0.4, cy + R * 0.95, 26);
    }
    // crtež: bela tačka, posle posluženja srce
    if (p.tacka > 0) {
      const r = Math.min(rt * 0.8, p.tacka);
      g.fillStyle(boja(B.milk), 1);
      g.fillCircle(cx, cy - r * 0.1, r);
    }
    // latijera i mlaz
    if (this.sankLatijera.visible) {
      const nagib = this.sipa ? (this.nisko ? -62 : -48) : -20;
      this.sankLatijera.setAngle(nagib).setPosition(this.nisko ? cx + 160 : cx + 220, this.nisko ? cy - 330 : cy - 420);
      if (this.sipa) {
        this.sankMlaz.lineStyle(this.nisko ? 18 : 12, boja(B.milk), 1);
        const sx = this.sankLatijera.x - 30;
        const sy = this.sankLatijera.y + 40;
        this.sankMlaz.lineBetween(sx, sy, cx + 4, cy - 10);
      }
    }
    // nivo
    const x0 = 240;
    const y0 = 980;
    const sir = 600;
    this.sankNivo.fillStyle(boja(B.card), 1);
    this.sankNivo.fillRoundedRect(x0, y0, sir, 34, 17);
    this.sankNivo.fillStyle(boja(B.mint), 1);
    this.sankNivo.fillRect(x0 + sir * 0.85, y0, sir * 0.15, 34);
    this.sankNivo.fillStyle(boja(pun > 1.02 ? B.red : B.crema), 1);
    this.sankNivo.fillRoundedRect(x0 + 4, y0 + 5, Math.max(20, Math.min(1.05, pun) * (sir - 8) * 0.952), 24, 12);
    this.sankNivo.lineStyle(5, boja(B.ink), 1);
    this.sankNivo.strokeRoundedRect(x0, y0, sir, 34, 17);
    this.sankNivoTekst.setPosition(540, 940).setText(`Šolja ${Math.round(pun * 100)}%${p.n.mleko ? ` · u latijeri ${Math.max(0, Math.round(p.n.mleko.ml - p.n.sipano))} ml` : ""}`);
  }

  private osveziSank() {
    const p = this.aktivna;
    const naSanku = this.naSanku(p);
    const mleko = !!p?.gost.pice.mleko;
    const imaMleka = naSanku && mleko && !!p!.n.mleko && p!.n.mleko.ml - p!.n.sipano > 1;
    this.dSipaj.postavi({ omogucen: imaMleka }).setVisible(mleko);
    this.dVisina.postavi({ omogucen: imaMleka, tekst: this.nisko ? "Podigni latijeru" : "Spusti latijeru" }).setVisible(mleko);
    this.dPosluzi.postavi({ omogucen: naSanku });
    this.sankPoruka.setText(
      !p
        ? "Izaberi porudžbinu na traci gore."
        : !p.n.sot
          ? "Prvo napravi espreso na aparatu."
          : !mleko
              ? "Espreso je spreman. Posluži ga."
              : !p.n.mleko || p.n.mleko.ml === 0
                ? "Prvo pripremi mleko."
                : this.nisko
                  ? "Latijera je nisko: drži Sipaj i crtaj belu tačku."
                  : "Sipaj sa visine do pola šolje, pa spusti latijeru za crtež.",
    );
    if (this.stanica === "sank") this.crtajSank();
  }

  private posluzi() {
    const p = this.aktivna;
    if (!p || !this.naSanku(p)) return;
    this.drziSipaj(false);
    // crtež: tačka u dobroj veličini i dobro spojeno mleko, sipano prvo sa visine
    if (p.gost.pice.mleko && p.n.mleko && p.n.sipano > 0) {
      const R = Phaser.Math.Clamp(150 + (((this.soljaAktivne()?.ml ?? 180) - 60) / 240) * 90, 140, 240);
      const cilj = (R - 18) * 0.45;
      const velicina = p.tacka > 0 ? k01(1 - Math.abs(p.tacka / cilj - 1)) : 0;
      const tekstura = p.n.mleko.spojeno >= 0.5 && p.n.mleko.mehurici < 0.3 ? 1 : 0.5;
      const redosled = p.visoko >= p.n.sipano * 0.35 ? 1 : 0.6;
      p.n.art = velicina * tekstura * redosled;
    }
    const ocena = M.oceni(p.n, p.gost, this.meni, this.obuka ? 0 : this.t - p.pogled.dosao);
    this.ocene.push({ ocena, pice: p.gost.pice.id });
    this.napojnice += ocena.napojnica;
    this.porudzbine = this.porudzbine.filter((x) => x !== p);
    this.cekaju = this.cekaju.filter((x) => x !== p.pogled);
    this.aktivna = this.porudzbine[0] ?? null;
    this.nisko = false;
    this.idiNa("kasa");
    this.reakcija(p.pogled, ocena);
    this.rasporedi();
    this.osveziSve();
  }

  /** Gost primi piće: obraduje se ili namršti, pa ocena i odlazak. */
  private reakcija(pg: GostPogled, o: M.Ocena) {
    const r: C.Raspolozenje = o.ukupno >= 0.75 ? "srecan" : o.ukupno >= 0.45 ? "neutralan" : "ljut";
    pg.slika.setTexture(`gost-${pg.gost.id}-${r}`);
    this.kasaGosti.bringToTop(pg.slika);
    this.tweens.killTweensOf(pg.slika);
    pg.slika.setPosition(470, 870).setScale(1.12).setAngle(0);
    if (!this.mirno && r === "srecan") this.tweens.add({ targets: pg.slika, y: 830, duration: 160, yoyo: true, repeat: 1 });
    if (o.ukupno >= 0.75) sfx.win();
    else if (o.ukupno < 0.45) sfx.bad();
    this.time.delayedCall(this.mirno ? 100 : 700, () => this.prozorOcene(pg, o));
  }

  private prozorOcene(pg: GostPogled, o: M.Ocena) {
    const kat = M.KATEGORIJE.filter((c) => o.kategorije[c.id] != null);
    const primedbe = o.primedbe.slice(0, 3);
    const vis = 470 + kat.length * 62 + primedbe.length * 92 + 170;
    this.prozor(
      vis,
      (c, zatvori, sir) => {
        const z = zvezdiceZa(o.ukupno);
        const komentar = ["Ovo nije ono što sam tražio.", "Može bolje.", "Dobro je!", "Savršeno, hvala!"][z];
        c.add(this.naslov(sir / 2, 48, `${pg.gost.ime}: „${komentar}”`, 42, { align: "center", wordWrap: { width: sir - 80 } }).setOrigin(0.5, 0));
        c.add(this.zvezdice(sir / 2, 200, z));
        c.add(this.naslov(sir / 2, 270, `+${o.napojnica} din${o.napamet ? " · napamet!" : ""}`, 44, { color: B.greenD }).setOrigin(0.5, 0));
        kat.forEach((k, i) => {
          const y = 370 + i * 62;
          const v = o.kategorije[k.id]!;
          const g = this.add.graphics();
          g.fillStyle(boja(B.sand), 1);
          g.fillRoundedRect(330, y + 6, 520, 28, 14);
          g.fillStyle(boja(v >= 0.8 ? B.green : v >= 0.5 ? B.yellow : B.red), 1);
          if (v > 0.02) g.fillRoundedRect(330, y + 6, Math.max(28, 520 * v), 28, 14);
          g.lineStyle(4, boja(B.ink), 1);
          g.strokeRoundedRect(330, y + 6, 520, 28, 14);
          c.add([g, this.tekst(90, y + 20, k.naziv, 32).setOrigin(0, 0.5)]);
        });
        let y0 = 390 + kat.length * 62;
        for (const s of primedbe) {
          const tx = this.tekst(90, y0, `• ${s}`, 30, { color: B.text2, wordWrap: { width: sir - 170 } });
          c.add(tx);
          y0 += tx.height + 18;
        }
        c.add(new Dugme(this, sir / 2, vis - 95, 400, 110, "Dalje", { boja: B.yellow, tap: zatvori }));
      },
      () => {
        this.tweens.add({
          targets: pg.slika,
          x: -260,
          duration: this.mirno ? 200 : 1100,
          ease: "Sine.In",
          onComplete: () => pg.slika.destroy(),
        });
        this.osveziSve();
        if (this.ocene.length === this.gosti.length)
          this.time.delayedCall(this.mirno ? 100 : 900, () => (this.obuka ? this.krajObuke() : this.krajSmene()));
      },
    );
  }

  private zvezdice(x: number, y: number, n: number) {
    const g = this.add.graphics();
    for (let i = 0; i < 3; i++) {
      const cx = x + (i - 1) * 110;
      const tacke: Phaser.Math.Vector2[] = [];
      for (let j = 0; j < 10; j++) {
        const r = j % 2 ? 22 : 48;
        const a = -Math.PI / 2 + (j * Math.PI) / 5;
        tacke.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, y + Math.sin(a) * r));
      }
      g.fillStyle(boja(i < n ? B.yellow : B.sand), 1);
      g.fillPoints(tacke, true);
      g.lineStyle(5, boja(B.ink), 1);
      g.strokePoints(tacke, true);
    }
    return g;
  }

  private krajSmene() {
    if (this.gotovaSmena) return;
    this.gotovaSmena = true;
    this.paraIskljuci();
    const rez = this.ocene.length ? this.ocene.reduce((a, o) => a + o.ocena.ukupno, 0) / this.ocene.length : 0;
    const proseci = M.sazetak(this.ocene.map((o) => o.ocena));
    const slabo = M.KATEGORIJE.filter((c) => proseci[c.id] != null && proseci[c.id]! < 0.8)
      .sort((a, b) => proseci[a.id]! - proseci[b.id]!)
      .slice(0, 2);
    const kat = M.KATEGORIJE.filter((c) => proseci[c.id] != null);
    const vis = 480 + kat.length * 62 + (slabo.length ? 90 + slabo.length * 120 : 80);
    this.pauza = true;
    // prozor bez dugmeta: dalje vodi aplikacija (Igraj ponovo, Nazad)
    this.add.rectangle(0, 0, W, H, boja(B.ink), 0.55).setOrigin(0).setDepth(90).setInteractive();
    const sir = 940;
    const c = this.add.container((W - sir) / 2, Math.max(40, (H - vis) / 2)).setDepth(91);
    const g = this.add.graphics();
    g.fillStyle(boja(B.ink), 1);
    g.fillRoundedRect(10, 10, sir, vis, 34);
    g.fillStyle(boja(B.card), 1);
    g.fillRoundedRect(0, 0, sir, vis, 34);
    g.lineStyle(6, boja(B.ink), 1);
    g.strokeRoundedRect(0, 0, sir, vis, 34);
    c.add(g);
    c.add(this.naslov(sir / 2, 50, "Smena je gotova!", 60).setOrigin(0.5, 0));
    c.add(this.zvezdice(sir / 2, 200, zvezdiceZa(rez)));
    c.add(this.naslov(sir / 2, 270, `${this.napojnice} din napojnica · ${this.ocene.length} gostiju`, 38, { color: B.greenD }).setOrigin(0.5, 0));
    kat.forEach((k, i) => {
      const y = 370 + i * 62;
      const v = proseci[k.id]!;
      const b = this.add.graphics();
      b.fillStyle(boja(B.sand), 1);
      b.fillRoundedRect(330, y + 6, 520, 28, 14);
      b.fillStyle(boja(v >= 0.8 ? B.green : v >= 0.5 ? B.yellow : B.red), 1);
      if (v > 0.02) b.fillRoundedRect(330, y + 6, Math.max(28, 520 * v), 28, 14);
      b.lineStyle(4, boja(B.ink), 1);
      b.strokeRoundedRect(330, y + 6, 520, 28, 14);
      c.add([b, this.tekst(90, y + 20, k.naziv, 32).setOrigin(0, 0.5)]);
    });
    let y = 400 + kat.length * 62;
    if (slabo.length) {
      c.add(this.naslov(90, y, "Šta da vežbaš", 38));
      y += 70;
      slabo.forEach((s) => {
        c.add(this.tekst(90, y, SAVETI[s.id], 30, { wordWrap: { width: sir - 180 } }));
        y += 120;
      });
    } else c.add(this.naslov(sir / 2, y, "Sve stanice odlično. Bravo!", 38, { color: B.greenD }).setOrigin(0.5, 0));
    if (!this.mirno) {
      c.setScale(0.92).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: "Back.Out" });
    }
    const pica: Record<string, number> = {};
    for (const id of new Set(this.ocene.map((o) => o.pice))) {
      const v = this.ocene.filter((o) => o.pice === id);
      pica[id] = Math.round((v.reduce((a, o) => a + o.ocena.ukupno, 0) / v.length) * 100) / 100;
    }
    this.kraj({
      igra_id: "smena",
      rezultat: Math.round(rez * 1000) / 1000,
      zvezdice: zvezdiceZa(rez),
      poeni: this.napojnice,
      detalji: { gostiju: this.ocene.length, kategorije: proseci, pica, napamet: this.ocene.filter((o) => o.ocena.napamet).length },
    });
  }

  // ---------- vođena smena ----------

  private vodic!: Phaser.GameObjects.Container;
  private vodicKartica!: Phaser.GameObjects.Graphics;
  private vodicTekst!: Phaser.GameObjects.Text;
  private vodicBroj!: Phaser.GameObjects.Text;
  private prsten!: Phaser.GameObjects.Container;
  private korakObuke = 0;
  private koraci: KorakObuke[] = [];

  /** Gde stoji kartica sa uputstvom na svakoj stanici (da ne pokrije ono što treba tapnuti). */
  private static readonly VODIC: Record<StanicaId, { x: number; y: number; w: number }> = {
    kasa: { x: 20, y: VRH + 1070, w: W - 40 },
    mlin: { x: 20, y: VRH + 16, w: W - 40 },
    aparat: { x: 20, y: VRH + 330, w: W - 40 },
    mleko: { x: 20, y: VRH + 16, w: 370 },
    sank: { x: 20, y: VRH + 16, w: W - 40 },
  };

  private gradiVodic() {
    this.vodic = this.add.container(0, 0).setDepth(60);
    this.vodicKartica = this.add.graphics();
    this.vodicBroj = this.tekst(0, 0, "", 22, { color: B.caption });
    this.vodicTekst = this.naslov(0, 0, "", 34, { lineSpacing: 2 });
    const preskoci = this.tekst(0, 0, "Preskoči", 24, { color: B.caption }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    preskoci.on("pointerdown", () => this.zavrsiObuku());
    preskoci.name = "preskoci";
    this.vodic.add([this.vodicKartica, this.vodicBroj, this.vodicTekst, preskoci]);
    // žuti krug koji pulsira na mestu gde treba tapnuti, sa strelicom iznad
    this.prsten = this.add.container(0, 0).setDepth(61);
    const g = this.add.graphics();
    g.lineStyle(10, boja(B.yellow), 1);
    g.strokeCircle(0, 0, 78);
    g.lineStyle(4, boja(B.ink), 1);
    g.strokeCircle(0, 0, 84);
    g.strokeCircle(0, 0, 72);
    const strela = this.add.graphics();
    strela.fillStyle(boja(B.yellow), 1);
    strela.fillTriangle(-26, -130, 26, -130, 0, -96);
    strela.lineStyle(4, boja(B.ink), 1);
    strela.strokeTriangle(-26, -130, 26, -130, 0, -96);
    this.prsten.add([g, strela]);
    if (!this.mirno) {
      this.tweens.add({ targets: g, scale: { from: 0.9, to: 1.08 }, alpha: { from: 1, to: 0.55 }, duration: 600, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      this.tweens.add({ targets: strela, y: -14, duration: 500, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    }
    this.koraci = this.napraviKorake();
  }

  private napraviKorake(): KorakObuke[] {
    const tab = (id: StanicaId) => () => [(W / STANICE.length) * (STANICE.findIndex((x) => x.id === id) + 0.5), VRH + VIS + 80] as [number, number];
    const dole = (x: number) => () => [x, VRH + DUGMAD_Y] as [number, number];
    const p = () => this.aktivna ?? this.porudzbine[0] ?? null;
    const pice = this.gosti[0].pice;
    const mleko = this.gosti[0].mleko;
    const solja = this.meni.solje.find((x) => x.id === pice.solja)!;
    const gi = () => p()?.grupa ?? 0;
    const grupaX = () => this.grupe[gi()].x;
    const sm = pice.mleko;
    const k: KorakObuke[] = [
      { st: "kasa", tekst: () => "Gost je stigao i rekao šta želi. Tapni Primi porudžbinu.", gde: () => (this.red[0]?.stigao ? [540, VRH + 960] : null), gotovo: () => this.porudzbine.length > 0 || this.ocene.length > 0 },
      { st: "kasa", tekst: () => "Porudžbina sada visi gore na traci. Idi na Mlin.", gde: tab("mlin"), gotovo: () => this.stanica !== "kasa" || (p()?.n.doza ?? 0) > 0 },
      {
        st: "mlin",
        tekst: () =>
          (p()?.n.doza ?? 0) > pice.espreso.doza[1] + 0.4
            ? "Previše kafe. Tapni Isprazni i melji ponovo."
            : `Drži Melji dok ekran ne pokaže ${opseg(pice.espreso.doza, " g")}. Pusti malo ranije: mlin dobaci još 0,3 g.`,
        gde: () => ((p()?.n.doza ?? 0) > pice.espreso.doza[1] + 0.4 ? [900, VRH + DUGMAD_Y] : [190, VRH + DUGMAD_Y]),
        gotovo: () => {
          const n = p()?.n;
          return !!n && (n.tamp != null || n.sot != null || (n.doza >= pice.espreso.doza[0] && n.doza <= pice.espreso.doza[1] + 0.4 && !this.melje && this.zaostatak <= 0));
        },
      },
      { st: "mlin", tekst: () => `Drži Tampuj. Pritisak raste na merilu desno; pusti kad je u zelenom (${M.TAMP.join("–")} kg).`, gde: dole(560), gotovo: () => p()?.n.tamp != null || !!p()?.n.sot },
      { st: "mlin", tekst: () => "Portafilter je spreman. Idi na Aparat.", gde: tab("aparat"), gotovo: () => this.stanica === "aparat" || !!p()?.n.sot },
      {
        st: "aparat",
        tekst: () => (p()?.n.solja && p()!.n.solja !== pice.solja ? `To nije prava šolja. ${pice.naziv} ide u: ${solja.naziv}.` : `Tapni šolju za ${pice.naziv.toLowerCase()}: ${solja.naziv} (${solja.ml} ml). Ona ide na vagu.`),
        gde: () => {
          const m = this.soljaNaPolici[pice.solja];
          return m ? [m.x, VRH + m.y] : null;
        },
        gotovo: () => p()?.n.solja === pice.solja || !!p()?.n.sot,
      },
      { st: "aparat", tekst: () => "Tapni Tara: vaga se vraća na 0, pa meri samo espreso, bez šolje.", gde: () => [grupaX(), VRH + 1290], gotovo: () => !!p()?.n.tara || !!p()?.n.sot },
      { st: "aparat", tekst: () => "Tapni Ubaci portafilter.", gde: () => [grupaX(), VRH + 1160], gotovo: () => this.grupe.some((g) => g.pf) || !!p()?.n.sot },
      { st: "aparat", tekst: () => "Tapni Start. Prvih 5 sekundi nema kapi: to je predinfuzija.", gde: () => [grupaX(), VRH + 1160], gotovo: () => this.grupe.some((g) => g.tece) || !!p()?.n.sot },
      {
        st: "aparat",
        tekst: () => `Prati vagu ispod šolje. Tapni Stop kad pokaže ${opseg(pice.espreso.prinos, " g")}; tada bi trebalo da je prošlo ${opseg(pice.espreso.vreme, " s")}.`,
        gde: () => [grupaX(), VRH + 1160],
        gotovo: () => !!p()?.n.sot,
      },
      {
        st: "aparat",
        tekst: () => "Šolja je već otišla na šank. Tapni Očisti grupu: izbij talog i isperi grupu za sledeći šot.",
        gde: () => [this.grupe.find((g) => g.gotova)?.x ?? grupaX(), VRH + 1160],
        gotovo: () => !this.grupe.some((g) => g.gotova),
      },
    ];
    if (sm) {
      k.push(
        { st: "aparat", tekst: () => "Sad mleko: idi na Mleko.", gde: tab("mleko"), gotovo: () => this.stanica === "mleko" || !!p()?.n.mleko },
        {
          st: "mleko",
          tekst: () => `Gost traži ${mleko!.naziv.toLowerCase()} mleko. Tapni taj tetrapak.`,
          gde: () => {
            const t = this.tetrapaci.find((x) => x.id === mleko!.id);
            return t ? [t.slika.x, VRH + PLOCA - 160] : null;
          },
          gotovo: () => p()?.n.mleko?.vrsta === mleko!.id,
        },
        { st: "mleko", tekst: () => `Drži Sipaj dok na latijeri ne piše ${opseg(sm.ml)} ml.`, gde: dole(190), gotovo: () => (p()?.n.mleko?.ml ?? 0) >= sm.ml[0] && !this.sipaMleko },
        { st: "mleko", tekst: () => "Tapni Para. Latijera ide pod stimer, sa vrhom na površini mleka.", gde: dole(560), gotovo: () => this.para || (p()?.n.mleko?.temp ?? 0) > 30 },
        {
          st: "mleko",
          tekst: () => "Vrh je na površini i ulazi vazduh. Gledaj traku Pena desno: čekaj da uđe u svetlozelenu zonu.",
          gde: () => [915, VRH + 570],
          gotovo: () => (p()?.n.mleko?.pena ?? 0) >= PENA_OPSEG[sm.pena][0] || (p()?.n.mleko?.temp ?? 0) > 50,
        },
        {
          st: "mleko",
          tekst: () => "Dosta pene. Povuci klizač VRH dole na DUBOKO: vrh potone i mleko se vrti.",
          gde: () => [Smena.KL.x, VRH + this.yZaDubinu(0.7)],
          gotovo: () => (this.para && p()?.n.mleko ? M.vrhZa(this.dubina(p()!.n.mleko!.ml)) === "duboko" : false) || (p()?.n.mleko?.temp ?? 0) > 50,
        },
        {
          st: "mleko",
          tekst: () => `Vrtlog spaja penu i mleko. Tapni Isključi paru kad je kazaljka termometra u zelenom (${opseg(sm.temp, " °C")}).`,
          gde: dole(560),
          gotovo: () => !this.para && (p()?.n.mleko?.temp ?? 0) > 40,
        },
        { st: "mleko", tekst: () => "Mleko je spremno. Idi na Šank.", gde: tab("sank"), gotovo: () => this.stanica === "sank" || (p()?.n.sipano ?? 0) > 0 },
        {
          st: "sank",
          tekst: () => "Drži Sipaj: latijera je visoko, pa se mleko meša sa espresom. Pusti kad je šolja do pola.",
          gde: dole(190),
          gotovo: () => (p() ? this.popunjenost(p()!) >= 0.45 : false) && !this.sipa,
        },
        { st: "sank", tekst: () => "Tapni Spusti latijeru: blizu površine mleko ostaje belo i crta.", gde: dole(560), gotovo: () => this.nisko || (p() ? this.popunjenost(p()!) >= 0.85 : false) },
        {
          st: "sank",
          tekst: () => "Drži Sipaj i crtaj belu tačku. Pusti kad je traka šolje u svetlozelenom (85–100%).",
          gde: dole(190),
          gotovo: () => (p() ? this.popunjenost(p()!) >= 0.85 : false) && !this.sipa,
        },
      );
    } else {
      k.push({ st: "aparat", tekst: () => "Espreso te čeka na šanku. Idi na Šank.", gde: tab("sank"), gotovo: () => this.stanica === "sank" });
    }
    k.push({ st: "sank", tekst: () => "Tapni Posluži. Gost će oceniti svaki korak.", gde: dole(900), gotovo: () => this.ocene.length > 0 });
    return k;
  }

  private osveziVodic() {
    if (!this.obuka || !this.vodic) return;
    while (this.korakObuke < this.koraci.length && this.koraci[this.korakObuke].gotovo()) {
      this.korakObuke++;
      if (this.korakObuke < this.koraci.length) sfx.tick();
    }
    const korak = this.koraci[this.korakObuke];
    const skrij = !korak || this.pauza;
    this.vodic.setVisible(!skrij);
    this.prsten.setVisible(false);
    if (skrij) return;
    const mesto = Smena.VODIC[this.stanica];
    const tekst = korak.tekst();
    if (this.vodicTekst.text !== tekst || this.vodic.getData("st") !== this.stanica) {
      this.vodic.setData("st", this.stanica);
      this.vodicTekst.setText(tekst).setWordWrapWidth(mesto.w - 48).setPosition(mesto.x + 24, mesto.y + 50);
      this.vodicBroj.setText(`Korak ${this.korakObuke + 1} od ${this.koraci.length}`).setPosition(mesto.x + 24, mesto.y + 16);
      (this.vodic.getByName("preskoci") as Phaser.GameObjects.Text).setPosition(mesto.x + mesto.w - 20, mesto.y + 14);
      const h = this.vodicTekst.height + 70;
      const g = this.vodicKartica;
      g.clear();
      g.fillStyle(boja(B.ink), 1);
      g.fillRoundedRect(mesto.x + 6, mesto.y + 6, mesto.w, h, 22);
      g.fillStyle(boja(B.yellowL), 1);
      g.fillRoundedRect(mesto.x, mesto.y, mesto.w, h, 22);
      g.lineStyle(5, boja(B.ink), 1);
      g.strokeRoundedRect(mesto.x, mesto.y, mesto.w, h, 22);
    }
    // krug se vidi samo na stanici na kojoj je korak (ili na dugmetu stanice dole)
    const gde = korak.gde();
    if (gde && (korak.st === this.stanica || gde[1] > VRH + VIS)) {
      this.prsten.setVisible(true).setPosition(gde[0], gde[1]);
    }
  }

  private zavrsiObuku() {
    try {
      localStorage.setItem(KLJUC_OBUKA, "1");
    } catch {
      /* bez skladišta: obuka se nudi ponovo */
    }
    this.ponovo(false);
  }

  private krajObuke() {
    this.prozor(820, (c, _zatvori, sir) => {
      c.add(this.naslov(sir / 2, 70, "Obuka je gotova!", 60).setOrigin(0.5, 0));
      c.add(
        this.tekst(
          sir / 2,
          180,
          "U pravoj smeni dolazi 5 gostiju, a porudžbine se preklapaju: dok šot teče, spremaš mleko. Karta na traci bira na kojoj porudžbini radiš, a žuta tačka dole pokazuje sledeću stanicu.",
          34,
          { color: B.text2, align: "center", wordWrap: { width: sir - 120 } },
        ).setOrigin(0.5, 0),
      );
      c.add(new Dugme(this, sir / 2, 680, 560, 130, "Prava smena", { boja: B.green, tekstBoja: "#fff", velicina: 46, tap: () => this.zavrsiObuku() }));
    });
  }

  // ---------- petlja ----------

  private osveziSve() {
    if (!this.spremno) return;
    this.osveziTraku();
    this.osveziTabove();
    this.osveziKasu();
    this.osveziMlin();
    this.osveziAparat();
    this.osveziMleko();
    this.osveziSank();
    this.dugmeRecept.setVisible(!!this.aktivna && this.stanica !== "kasa" && !this.obuka);
    this.brojGostiju.setText(`Gost ${Math.min(this.gosti.length, this.ocene.length + 1)}/${this.gosti.length}`);
    this.novac.setText(`${this.napojnice} din`);
  }

  update() {
    if (!this.spremno || this.pauza || this.gotovaSmena) return;
    // stvarno proteklo vreme (ne izglađeni korak): na sporom telefonu šot i para traju isto koliko i na brzom
    const dt = Math.min(0.25, this.game.loop.rawDelta / 1000);
    this.t += dt;
    // novi gost: po rasporedu, ili odmah ako je kafić prazan
    const g = this.gosti[this.sledeci];
    if (g && (this.t >= g.dolazak || (!this.red.length && !this.porudzbine.length && this.t > 2))) {
      if (this.t < g.dolazak) for (let i = this.sledeci; i < this.gosti.length; i++) this.gosti[i].dolazak -= g.dolazak - this.t;
      this.gostUlazi(g);
    }
    this.crtajMlin(dt);
    this.korakAparata(dt);
    this.korakMleka(dt);
    this.korakSanka(dt);
    // raspoloženje onih koji čekaju
    for (const pg of [...this.red, ...this.cekaju]) {
      const odnos = (this.t - pg.dosao) / this.strpljenje(pg.gost.pice);
      const r: C.Raspolozenje = odnos < 0.6 ? "neutralan" : odnos < 1 ? "nestrpljiv" : "ljut";
      if (r !== pg.raspolozenje) {
        pg.raspolozenje = r;
        pg.slika.setTexture(`gost-${pg.gost.id}-${r}`);
      }
    }
    this.osveziStrpljenje();
    const min = 8 * 60 + Math.floor(this.t / 2);
    this.sat.setText(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);
    // mlin, mleko i aparat menjaju dugmad dok se drži; jeftino je, pa se osvežavaju svaki kadar
    if (this.melje || this.tampuje || this.zaostatak > 0) this.osveziMlin();
    if (this.grupe.some((x) => x.tece)) {
      this.osveziTabove();
    }
    if (this.para || this.sipaMleko) this.osveziMleko();
    if (this.sipa) this.osveziSank();
    this.osveziVodic();
  }
}

export const smena: PokreniIgru = (host, ulaz, gotovo) => {
  sfx.on = ulaz.podesavanja.zvuk;
  const konf = ulaz.konfiguracija as unknown as KonfiguracijaSmene;
  let scena: Smena | null = null;
  let igra: Phaser.Game | null = null;
  let ugasena = false;

  const ugasi = () => {
    scena?.ugasi();
    igra?.destroy(true);
    scena = null;
    igra = null;
  };

  /** Vođena i prava smena su posebne igre: prelaz gasi jednu i pravi drugu u istom prostoru. */
  const pokreni = (obuka: boolean) => {
    const pocetak = Date.now();
    host.innerHTML = "";
    scena = new Smena(
      konf,
      ulaz.podesavanja.smanjeno_kretanje,
      obuka,
      (r) => gotovo({ ...r, trajanje_ms: Date.now() - pocetak }),
      (sledeca) =>
        // Phaser ne sme da se ugasi iz sopstvenog događaja: prelaz ide u sledeći krug
        setTimeout(() => {
          if (ugasena) return;
          ugasi();
          pokreni(sledeca);
        }, 0),
    );
    igra = new Phaser.Game({
      // e2e u razvoju: softverski WebGL je spor, pa testovi mogu da traže 2D canvas
      type: process.env.NODE_ENV !== "production" && /[?&]canvas\b/.test(location.search) ? Phaser.CANVAS : Phaser.AUTO,
      parent: host,
      width: W,
      height: H,
      backgroundColor: B.bg,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: scena,
      banner: false,
      audio: { noAudio: true },
      input: { activePointers: 2 },
    });
    // e2e provere u razvoju čitaju stanje smene
    if (process.env.NODE_ENV !== "production") (window as unknown as { __smena?: unknown }).__smena = scena;
  };

  pokreni(false);
  return {
    unisti: () => {
      ugasena = true;
      ugasi();
    },
  };
};
