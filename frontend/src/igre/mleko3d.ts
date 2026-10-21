/**
 * „Kralj pare” u 3D (proba): ista pravila i bodovanje kao 2D verzija (lib/igre.ts: mlekoKorak, mlekoOcena),
 * scena u three.js sa modelima iz Blender-a (frontend/modeli/kralj_pare.py → public/modeli/kralj-pare.glb).
 *
 * Kao u stvarnosti: stimer stoji, a polaznik pomera latijeru gore-dole (prevlačenjem ili klizačem).
 * Učitava se tek kad se igra otvori (dynamic import iz registar.ts), pa ne opterećuje ostatak aplikacije.
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { icon } from "@/lib/art";
import { mlekoKorak, mlekoOcena, mlekoPocetak, starRow } from "@/lib/igre";
import { esc, sfx } from "@/lib/jezgro";

const MODEL = "/modeli/kralj-pare.glb";
/** visina vrha stimera u sceni (m) */
const VRH_Y = 0.07;
/** dubina ±1 iz pravila igre = vrh 16 mm iznad ili ispod površine */
const OPSEG = 0.016;
/** mleko u latijeri pre pene i koliko pena podiže površinu (m) */
const MLEKO = 0.055;
const PENA = 0.026;
/** vrh stimera je pomeren od sredine latijere, da mleko može da se vrti */
const VRH_X = 0.014;

type Stanje = { t: number; depth: number; foam: number; texture: number; big: number; temp: number; steam: boolean; swirl: boolean };
type Opcije = { onDone?: (r: { score: number; stars: number }) => void; smanjenoKretanje?: boolean };
type Zvuk = { set: (vol: number, freq: number) => void; stop: () => void } | null;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function mleko3d(host: HTMLElement, opt: Opcije = {}) {
  host.innerHTML =
    '<div class="game milk"><div class="g-head"><span>Kralj pare <em class="znak-3d">3D proba</em></span><span class="g-goal">Cilj: pena, vrtlog, stop na 55–65 °C</span></div>' +
    '<p class="g-brief">Uključi paru. Vrh drži na površini dok ne uđe dovoljno vazduha, pa ga potopi za vrtlog. Isključi paru u zelenoj zoni. Latijeru pomeraš prevlačenjem gore-dole.</p>' +
    '<div class="g-stage plate milk-stage m3"><p class="m3-ucitava">Učitavam 3D scenu…</p>' +
    '<div class="m3-termo" aria-hidden="true"><b>5 °C</b><span><em></em><i></i></span></div></div>' +
    '<label class="rng" for="milk-depth"><span class="ctrl-l">Vrh stimera (ili prevuci latijeru gore-dole)</span>' +
    '<input type="range" id="milk-depth" min="-100" max="100" value="-45"><span class="rng-l" aria-hidden="true"><i>iznad</i><i>površina</i><i>duboko</i></span></label>' +
    '<div class="mbars"><div class="mbar"><span>Pena</span><b><i class="mb-foam"></i><em class="mb-zone"></em></b></div>' +
    '<div class="mbar"><span>Spajanje</span><b><i class="mb-tex"></i></b></div>' +
    '<div class="mbar warn"><span>Krupni mehurići</span><b><i class="mb-big"></i></b></div></div>' +
    '<div class="g-msg" aria-live="polite"></div><div class="g-btns"><button type="button" class="btn btn-gold btn-big g-go" disabled>Uključi paru</button></div></div>';
  const $ = <T extends Element = HTMLElement>(sel: string) => host.querySelector(sel) as T;
  const stage = $(".milk-stage");
  const rng = $<HTMLInputElement>("#milk-depth");
  const go = $<HTMLButtonElement>(".g-go");
  const msg = $(".g-msg");

  // ---------- scena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const cv = renderer.domElement;
  stage.prepend(cv);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const okruzenje = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environment = okruzenje;
  scena.add(new THREE.HemisphereLight(0xfffbf2, 0xd9d4bf, 0.6));
  const sunce = new THREE.DirectionalLight(0xffffff, 1.4);
  sunce.position.set(0.4, 0.8, 0.5);
  scena.add(sunce);

  // odozgo i malo sa strane: vidi se u latijeru (pena, vrtlog), kljun i stimer
  const kamera = new THREE.PerspectiveCamera(30, 36 / 25, 0.01, 5);
  kamera.position.set(0.085, 0.3, 0.15);
  const cilj = new THREE.Vector3(-0.006, 0.07, 0);
  kamera.lookAt(cilj);

  // senka ispod latijere (meka mrlja umesto pravih senki, jeftino na telefonu)
  const senkaTex = mekiKrug("rgba(23,23,23,0.35)");
  const senka = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ map: senkaTex, transparent: true, depthWrite: false }));
  senka.rotation.x = -Math.PI / 2;
  senka.position.y = 0.0002;
  scena.add(senka);

  // površina mleka: krug čiji se crtež (pena, vrtlog, mehurići) crta na malom canvasu svaki frejm
  const povrsCv = document.createElement("canvas");
  povrsCv.width = povrsCv.height = 256;
  const pctx = povrsCv.getContext("2d")!;
  const povrsTex = new THREE.CanvasTexture(povrsCv);
  povrsTex.colorSpace = THREE.SRGBColorSpace;
  const povrs = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ map: povrsTex, roughness: 0.55, metalness: 0 }));
  povrs.rotation.x = -Math.PI / 2;

  // para: nekoliko mekih spriteova iznad vrha stimera
  const paraTex = mekiKrug("rgba(255,255,255,0.9)");
  const para = Array.from({ length: 22 }, (_, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: paraTex, transparent: true, depthWrite: false, opacity: 0 }));
    sp.userData.faza = i / 22;
    scena.add(sp);
    return sp;
  });

  let latijera: THREE.Object3D | null = null;
  let profil: [number, number][] = [];
  let unisteno = false;

  new GLTFLoader().load(
    MODEL,
    (gltf) => {
      if (unisteno) return;
      scena.add(gltf.scene);
      latijera = gltf.scene.getObjectByName("Latijera") ?? null;
      if (latijera) {
        profil = JSON.parse((latijera.userData.profil as string) ?? "[]");
        latijera.add(povrs);
      }
      $(".m3-ucitava")?.remove();
      go.disabled = false;
      precrtaj = 3;
      paint(0);
    },
    undefined,
    () => {
      const p = $(".m3-ucitava");
      if (p) p.textContent = "3D scena nije učitana. Proveri vezu ili igraj klasičnu verziju.";
    },
  );

  /** unutrašnji poluprečnik latijere na visini h (linearno između tačaka profila iz Blender-a) */
  function poluprecnik(h: number) {
    if (!profil.length) return 0.038;
    for (let i = 1; i < profil.length; i++) {
      const [r0, z0] = profil[i - 1];
      const [r1, z1] = profil[i];
      if (h <= z1) return r0 + ((r1 - r0) * (h - z0)) / Math.max(1e-6, z1 - z0);
    }
    return profil[profil.length - 1][0];
  }

  // ---------- igra (ista pravila kao 2D) ----------
  let s: Stanje = mlekoPocetak();
  let raf = 0;
  let last = 0;
  let hiss: Zvuk = null;
  let hint = "";
  let finished = false;
  let latY = VRH_Y - MLEKO;
  // scena se crta samo kad se nešto menja (para, pomeranje latijere), da igra ne troši bateriju dok miruje
  let precrtaj = 3;

  function reset() {
    s = mlekoPocetak();
    rng.value = "-45";
    finished = false;
    msg.textContent = "";
    msg.className = "g-msg";
    host.querySelector(".g-res")?.remove();
    go.textContent = "Uključi paru";
    go.className = "btn btn-gold btn-big g-go";
  }

  function frame(now: number) {
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    s.t += dt;
    if (s.steam) {
      const k = mlekoKorak(s, dt);
      if (k.savet !== hint) {
        hint = k.savet;
        msg.textContent = hint;
        msg.className = "g-msg";
      }
      hiss?.set(k.zona === "air" ? 0.07 : k.zona === "surf" ? 0.045 : 0.02, k.zona === "air" ? 4200 : k.zona === "surf" ? 2600 : 600);
      if (k.pregorelo) end(true);
    }
    paint(dt);
    raf = requestAnimationFrame(frame);
  }

  function paint(dt: number) {
    const nivo = MLEKO + s.foam * PENA;
    // stimer stoji; latijera se pomera tako da je površina na zadatoj dubini u odnosu na vrh
    const ciljY = VRH_Y + s.depth * OPSEG - nivo;
    if (Math.abs(ciljY - latY) > 1e-5) precrtaj = 2;
    latY += (ciljY - latY) * Math.min(1, dt ? dt * 14 : 1);
    if (latijera) {
      latijera.position.set(-VRH_X, latY, 0);
      const r = poluprecnik(nivo);
      povrs.position.y = nivo;
      povrs.scale.setScalar(r);
    }
    senka.position.x = -VRH_X;
    const paraVidljiva = para.some((sp) => (sp.material as THREE.SpriteMaterial).opacity > 0.001);
    if (s.steam || paraVidljiva) precrtaj = 2;
    if (precrtaj <= 0) return;
    precrtaj--;
    crtajPovrs();
    crtajParu(dt);
    $(".mb-foam").style.width = (s.foam * 100).toFixed(0) + "%";
    $(".mb-tex").style.width = (s.texture * 100).toFixed(0) + "%";
    $(".mb-big").style.width = (s.big * 100).toFixed(0) + "%";
    const tt = clamp(s.temp, 0, 80);
    $(".m3-termo b").textContent = Math.round(tt) + " °C";
    const stub = $(".m3-termo i");
    stub.style.height = ((tt / 80) * 100).toFixed(1) + "%";
    stub.classList.toggle("vruce", tt > 66);
    renderer.render(scena, kamera);
  }

  /** pogled odozgo na mleko: boja pene, vrtlog, sitni i krupni mehurići, prskanje oko vrha */
  function crtajPovrs() {
    const W = 256;
    const c = W / 2;
    pctx.clearRect(0, 0, W, W);
    pctx.fillStyle = "#f4ede1";
    pctx.fillRect(0, 0, W, W);
    if (s.foam > 0.02) {
      pctx.fillStyle = `rgba(255,255,255,${(Math.min(1, s.foam * 2.2) * (0.55 + 0.45 * s.texture)).toFixed(3)})`;
      pctx.fillRect(0, 0, W, W);
    }
    // vrtlog: lukovi koji se okreću oko sredine
    if (s.swirl || s.texture > 0.05) {
      const brzina = s.swirl && !opt.smanjenoKretanje ? 5 : 0.4;
      pctx.strokeStyle = `rgba(140,118,92,${(0.2 + 0.3 * (s.swirl ? 1 : 0)).toFixed(2)})`;
      pctx.lineCap = "round";
      pctx.lineWidth = 7;
      for (let k = 0; k < 5; k++) {
        const a = s.t * brzina + k * 1.26;
        const rr = 22 + k * 21;
        pctx.beginPath();
        pctx.arc(c, c, rr, a, a + 1.8 + s.texture);
        pctx.stroke();
      }
    }
    // sitni mehurići dok pena nije spojena, krupni kad je vrh previsoko
    if (s.texture < 0.5 && s.foam > 0.05) {
      pctx.fillStyle = "rgba(120,100,80,.18)";
      for (let i = 0; i < 70; i++) {
        const a = i * 2.39996;
        const rr = 8 + ((i * 37) % 110);
        pctx.beginPath();
        pctx.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 1.6, 0, Math.PI * 2);
        pctx.fill();
      }
    }
    if (s.big > 0.08) {
      pctx.strokeStyle = "rgba(90,75,60,.45)";
      pctx.lineWidth = 2;
      for (let i = 0; i < 26 * s.big; i++) {
        const a = i * 2.1 + 0.4;
        const rr = 14 + ((i * 53) % 96);
        pctx.beginPath();
        pctx.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 5 + (i % 3) * 3, 0, Math.PI * 2);
        pctx.stroke();
      }
    }
    // prskanje oko vrha kad je na površini
    if (s.steam && s.depth > -0.3 && s.depth < 0.2) {
      const vx = c + (VRH_X / 0.038) * c;
      pctx.fillStyle = "rgba(255,255,255,.95)";
      for (let k = 0; k < 9; k++) {
        const a = s.t * 20 + k * 0.7;
        pctx.beginPath();
        pctx.arc(vx + Math.cos(a) * (6 + (k % 3) * 5), c + Math.sin(a) * (6 + (k % 3) * 5), 2.4, 0, Math.PI * 2);
        pctx.fill();
      }
    }
    povrsTex.needsUpdate = true;
  }

  function crtajParu(dt: number) {
    const uVazduhu = s.depth < -0.3;
    for (const sp of para) {
      const m = sp.material as THREE.SpriteMaterial;
      if (!s.steam) {
        m.opacity = Math.max(0, m.opacity - dt * 2);
        continue;
      }
      sp.userData.faza = (sp.userData.faza + dt * (uVazduhu ? 1.6 : 0.8)) % 1;
      const f = sp.userData.faza as number;
      const sirenje = uVazduhu ? 0.05 : 0.02;
      sp.position.set(Math.sin(f * 9 + sp.id) * sirenje * f, VRH_Y + 0.02 + f * 0.11, Math.cos(f * 7 + sp.id) * sirenje * f);
      sp.scale.setScalar(0.012 + f * 0.04);
      m.opacity = (uVazduhu ? 0.5 : 0.28) * (1 - f) * Math.min(1, f * 6);
    }
  }

  function end(scorched: boolean) {
    s.steam = false;
    s.swirl = false;
    hiss?.stop();
    hiss = null;
    finished = true;
    const { checks, okN, stars } = mlekoOcena(s, scorched) as { checks: [boolean, string][]; okN: number; stars: number };
    if (stars >= 2) sfx.ok();
    else sfx.bad();
    const res = document.createElement("div");
    res.className = "g-res";
    res.innerHTML =
      starRow(stars) +
      '<ul class="checks">' +
      checks.map((c) => '<li class="' + (c[0] ? "ok" : "bad") + '">' + icon(c[0] ? "check" : "close") + esc(c[1]) + "</li>").join("") +
      "</ul>";
    host.querySelector(".game")!.insertBefore(res, host.querySelector(".g-btns"));
    msg.textContent = "";
    go.textContent = "Probaj ponovo";
    go.className = "btn btn-ghost btn-big g-go";
    opt.onDone?.({ score: okN / 4, stars });
  }

  go.addEventListener("click", () => {
    if (finished) {
      reset();
      return;
    }
    if (!s.steam) {
      s.steam = true;
      hint = "";
      hiss = sfx.hiss(2600, 0.6);
      go.textContent = "Isključi paru";
      go.className = "btn btn-cherry btn-big g-go";
      sfx.tap();
    } else end(false);
  });
  rng.addEventListener("input", () => {
    s.depth = Number(rng.value) / 100;
  });
  let drag: { y: number; d: number } | null = null;
  cv.addEventListener("pointerdown", (e) => {
    drag = { y: e.clientY, d: s.depth };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag) return;
    // prevlačenje nagore diže latijeru, pa vrh ide dublje
    const k = 2.2 / cv.getBoundingClientRect().height;
    s.depth = clamp(drag.d + (drag.y - e.clientY) * k, -1, 1);
    rng.value = String(Math.round(s.depth * 100));
    precrtaj = 2;
  });
  const up = () => {
    drag = null;
  };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  const velicina = () => {
    const w = stage.clientWidth;
    const h = Math.round((w * 25) / 36);
    renderer.setSize(w, h, false);
    kamera.aspect = w / h;
    kamera.updateProjectionMatrix();
    precrtaj = 2;
  };
  const ro = new ResizeObserver(velicina);
  ro.observe(stage);
  velicina();
  reset();
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      unisteno = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      hiss?.stop();
      scena.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
          (x as THREE.MeshStandardMaterial).map?.dispose();
          x.dispose();
        });
      });
      okruzenje.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/** meka okrugla mrlja (para, senka) kao tekstura */
function mekiKrug(boja: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, boja);
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
