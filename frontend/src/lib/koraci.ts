// @ts-nocheck -- preneto iz artifacta (design/artifact/app.js, "prikaz koraka"); tipovi se dodaju postepeno.
// Svaki tip koraka vraća { html, mount(root, api) }. api: ready(on), check(fn), answer(rezultat, { correct }).
import * as A from "./art";
import type { InstancaIgre, RezultatIgre } from "@/igre/ugovor";
import * as G from "./igre";
import * as U from "./jezgro";
import { sfx } from "./jezgro";

const { esc, md } = U;
const icon = A.icon;

/** Veza sa lekcijom koja prikazuje korak (u artifactu globalno L i cleanups). */
export type KontekstKoraka = {
  odgovoreno: () => boolean;
  pospremi: (fn: () => void) => void;
  /** pokreće igru unutar lekcije po ugovoru; lekcija šalje rezultat serveru i dobija ga ovde za odgovor */
  igra: (igra: string, host: HTMLElement, gotovo: (r: RezultatIgre) => void) => InstancaIgre;
};

let K: KontekstKoraka = { odgovoreno: () => false, pospremi: () => {}, igra: () => ({ unisti() {} }) };
export function postaviKontekst(k: KontekstKoraka) {
  K = k;
}

/* ---------- prikaz koraka ---------- */
function mediaHTML(st) {
  if (st.img) return '<figure class="media' + (st.fit === "contain" ? " contain" : "") + '"' + (st.bg ? ' style="--mbg:' + st.bg + '"' : "") + '><img src="' + st.img + '" alt="' + esc(st.title || "") + '" decoding="async"></figure>';
  if (st.gallery) return '<div class="gal" style="--n:' + st.gallery.length + '">' + st.gallery.map((g) => '<figure><span class="gal-img"><img src="' + g.img + '" alt="' + esc(g.cap) + '" loading="lazy"></span><figcaption>' + esc(g.cap) + "</figcaption></figure>").join("") + "</div>";
  if (st.art) return '<div class="art plate">' + A.misc(st.art) + "</div>";
  return "";
}
const remember = (st) => st.remember ? '<div class="remember"><b>Zapamti</b><span>' + md(st.remember) + "</span></div>" : "";
const list = (l) => '<ul class="tl">' + l.map((x) => "<li><b>" + esc(x.y) + "</b><span>" + md(x.t) + "</span></li>").join("") + "</ul>";
const qHead = (kind, q) => '<p class="eyebrow q-k">' + kind + '</p><h2 class="q">' + md(q) + "</h2>";
const fmtV = (v, step) => U.num(v, step < 1 ? 1 : 0);

/** Tipovi koraka: story, explore, clip, game, mc, tf, num, order, match, sort, hotspot. */
export type Prikaz = { html: string; mount?: (root: HTMLElement, api: ApiKoraka) => void };
export type ApiKoraka = {
  ready: (on: boolean) => void;
  check: (fn: () => { frac: number; correct?: string } | undefined) => void;
  answer: (frac: number, extra?: { correct?: string }) => void;
};

export const RENDER: Record<string, (st: any) => Prikaz> = {
  story(st) {
    return { html: mediaHTML(st) + '<h2 class="st-title">' + esc(st.title) + "</h2>" + (st.list ? list(st.list) : "") + (st.text ? '<p class="st-text">' + md(st.text) + "</p>" : "") + remember(st) };
  },
  explore(st) {
    const d = A.diagram(st.art);
    return {
      html: '<p class="eyebrow q-k">Istraži</p><h2 class="st-title">' + esc(st.title) + '</h2><p class="st-text">' + md(st.text) + '</p><div class="art plate dg">' + d.svg() + "</div>" +
        '<div class="xinfo" aria-live="polite"><b>Tapni deo crteža</b><span>0/' + d.parts.length + " istraženo</span></div>" + remember(st),
      mount(root) {
        const seen = {}, info = root.querySelector(".xinfo");
        root.querySelector(".dg").addEventListener("click", (e) => {
          const p = e.target.closest(".part"); if (!p) return;
          const id = p.dataset.part, part = d.parts.find((x) => x.id === id);
          root.querySelectorAll(".part").forEach((x) => x.classList.toggle("on", x === p));
          const l = root.querySelector('.lbl[data-for="' + id + '"]'); if (l) l.classList.add("show");
          seen[id] = 1; const n = Object.keys(seen).length;
          info.innerHTML = "<b>" + esc(part.label) + "</b><span>" + esc(part.desc) + "</span><em>" + (n === d.parts.length ? "Sve istraženo!" : n + "/" + d.parts.length + " istraženo") + "</em>";
          n === d.parts.length && Object.keys(seen).length === n && !info.dataset.done ? (info.dataset.done = 1, sfx.ok()) : sfx.tap();
        });
      }
    };
  },
  clip(st) {
    return {
      html: '<p class="eyebrow q-k">Klip</p><h2 class="st-title">' + esc(st.title) + '</h2><div class="clip-host"></div><p class="st-text">' + md(st.text) + "</p>" + remember(st),
      mount(root) { const c = G.clip(root.querySelector(".clip-host"), st.clip); K.pospremi(() => c.destroy()); }
    };
  },
  game(st) {
    return {
      html: '<p class="eyebrow q-k">Igra</p><h2 class="st-title">' + esc(st.title) + '</h2><p class="st-text">' + esc(st.text) + '</p><div class="game-host"></div>',
      mount(root, api) {
        // igra ide kroz ugovor (igre/registar.ts), pa lekcija radi isto sa JS i sa Unity verzijom
        const inst = K.igra(st.game, root.querySelector(".game-host"), (r) => {
          if (!K.odgovoreno()) api.answer(r.rezultat, { correct: "" });
        });
        K.pospremi(() => inst.unisti());
      }
    };
  },
  mc(st) {
    const order = U.shuffle(st.opts.map((_, i) => i));
    return {
      html: (st.art ? '<div class="art plate art-q">' + A.misc(st.art) + "</div>" : "") + qHead("Pitanje", st.q) +
        '<div class="opts" role="radiogroup">' + order.map((oi, k) => '<button type="button" class="opt" role="radio" aria-checked="false" data-i="' + oi + '"><span class="opt-k">' + "ABCD"[k] + "</span><span>" + esc(st.opts[oi]) + "</span></button>").join("") + "</div>",
      mount(root, api) {
        let sel = -1;
        root.querySelector(".opts").addEventListener("click", (e) => {
          const b = e.target.closest(".opt"); if (!b || K.odgovoreno()) return;
          sel = Number(b.dataset.i); sfx.tap();
          root.querySelectorAll(".opt").forEach((x) => { x.classList.toggle("sel", x === b); x.setAttribute("aria-checked", x === b); });
          api.ready(true);
        });
        api.check(() => {
          root.querySelectorAll(".opt").forEach((x) => { const i = Number(x.dataset.i); if (i === st.a) x.classList.add("ok"); else if (i === sel) x.classList.add("bad"); x.disabled = true; });
          return { frac: sel === st.a ? 1 : 0, correct: sel === st.a ? "" : "Tačan odgovor: <b>" + esc(st.opts[st.a]) + "</b>" };
        });
      }
    };
  },
  tf(st) {
    return {
      html: qHead("Tačno ili netačno?", st.q) + '<div class="tf"><button type="button" class="tfb tf-yes" data-v="1">' + icon("check") + 'Tačno</button><button type="button" class="tfb tf-no" data-v="0">' + icon("close") + "Netačno</button></div>",
      mount(root, api) {
        root.querySelector(".tf").addEventListener("click", (e) => {
          const b = e.target.closest(".tfb"); if (!b || K.odgovoreno()) return;
          const v = b.dataset.v === "1", ok = v === st.a;
          b.classList.add(ok ? "ok" : "bad");
          root.querySelectorAll(".tfb").forEach((x) => (x.disabled = true));
          api.answer(ok ? 1 : 0, { correct: ok ? "" : "Tačan odgovor: <b>" + (st.a ? "Tačno" : "Netačno") + "</b>" });
        });
      }
    };
  },
  num(st) {
    const id = "num-range";
    return {
      html: qHead("Pomeri klizač", st.q) + '<div class="num"><output class="num-val" for="' + id + '"><b>' + fmtV(st.start, st.step) + "</b> " + esc(st.unit) + "</output>" +
        '<input type="range" id="' + id + '" min="' + st.min + '" max="' + st.max + '" step="' + st.step + '" value="' + st.start + '" aria-label="' + esc(st.q) + '">' +
        '<div class="num-scale" aria-hidden="true"><span>' + fmtV(st.min, st.step) + " " + esc(st.unit) + "</span><span>" + fmtV(st.max, st.step) + " " + esc(st.unit) + "</span></div></div>",
      mount(root, api) {
        const inp = root.querySelector("input"), out = root.querySelector(".num-val b");
        let last = st.start;
        inp.addEventListener("input", () => {
          const v = Number(inp.value); out.textContent = fmtV(v, st.step);
          if (v !== last) { sfx.tick(); last = v; } api.ready(true);
        });
        api.check(() => {
          const v = Number(inp.value), lo = st.a[0], hi = st.a[1];
          inp.disabled = true;
          const okv = v >= lo - 1e-9 && v <= hi + 1e-9;
          const near = Math.min(Math.abs(v - lo), Math.abs(v - hi)) <= (st.max - st.min) * 0.06;
          root.querySelector(".num").classList.add(okv ? "ok" : near ? "mid" : "bad");
          const ans = (lo === hi ? fmtV(lo, st.step) : fmtV(lo, st.step) + "–" + fmtV(hi, st.step)) + " " + st.unit;
          return { frac: okv ? 1 : near ? 0.5 : 0, correct: okv ? "" : "Tačno je: <b>" + esc(ans) + "</b>" };
        });
      }
    };
  },
  order(st) {
    let sh = U.shuffle(st.items.map((_, i) => i));
    if (sh.every((v, i) => v === i)) sh = sh.slice(1).concat(sh[0]);
    return {
      html: qHead("Poređaj", st.q) + '<ol class="ord-ans" aria-label="Tvoj redosled"></ol><div class="ord-pool">' +
        sh.map((i) => '<button type="button" class="chip-btn" data-i="' + i + '">' + esc(st.items[i]) + "</button>").join("") + '</div><p class="hint">Tapni stavke redom. Tapni stavku gore da je vratiš.</p>',
      mount(root, api) {
        const ans = root.querySelector(".ord-ans"), pool = root.querySelector(".ord-pool");
        root.addEventListener("click", (e) => {
          const b = e.target.closest(".chip-btn"); if (!b || K.odgovoreno()) return;
          sfx.tap();
          if (b.parentNode === pool) { const li = document.createElement("li"); li.appendChild(b); ans.appendChild(li); }
          else { const li = b.parentNode; pool.appendChild(b); li.remove(); }
          api.ready(pool.children.length === 0);
        });
        api.check(() => {
          const got = [...ans.querySelectorAll(".chip-btn")].map((b) => Number(b.dataset.i));
          let ok = 0;
          got.forEach((v, k) => { const li = ans.children[k]; if (v === k) { ok++; li.classList.add("ok"); } else li.classList.add("bad"); li.querySelector("button").disabled = true; });
          const frac = ok / st.items.length;
          return { frac, correct: frac >= 0.99 ? "" : "Tačan redosled: " + st.items.map((x, i) => "<b>" + (i + 1) + ".</b> " + esc(x)).join(" · ") };
        });
      }
    };
  },
  match(st) {
    const right = U.shuffle(st.pairs.map((_, i) => i));
    return {
      html: qHead("Spoji parove", st.q) + '<div class="match"><div class="m-col">' + st.pairs.map((p, i) => '<button type="button" class="m-btn" data-side="l" data-i="' + i + '">' + esc(p[0]) + "</button>").join("") +
        '</div><div class="m-col">' + right.map((i) => '<button type="button" class="m-btn" data-side="r" data-i="' + i + '">' + esc(st.pairs[i][1]) + "</button>").join("") + "</div></div>",
      mount(root, api) {
        let selL = null, selR = null, done = 0, miss = 0;
        root.querySelector(".match").addEventListener("click", (e) => {
          const b = e.target.closest(".m-btn"); if (!b || b.classList.contains("done") || K.odgovoreno()) return;
          if (b.dataset.side === "l") { selL = b; root.querySelectorAll('[data-side="l"]').forEach((x) => x.classList.toggle("sel", x === b)); }
          else { selR = b; root.querySelectorAll('[data-side="r"]').forEach((x) => x.classList.toggle("sel", x === b)); }
          sfx.tap();
          if (selL && selR) {
            const a = selL, c = selR; selL = selR = null;
            a.classList.remove("sel"); c.classList.remove("sel");
            if (a.dataset.i === c.dataset.i) { a.classList.add("done"); c.classList.add("done"); a.disabled = c.disabled = true; done++; sfx.ok(); }
            else { miss++; [a, c].forEach((x) => { x.classList.add("err"); setTimeout(() => x.classList.remove("err"), 450); }); sfx.bad(); }
            if (done === st.pairs.length) api.answer(U.clamp(1 - miss * 0.2, 0, 1), { correct: miss ? "Pogrešnih pokušaja: <b>" + miss + "</b>" : "" });
          }
        });
      }
    };
  },
  sort(st) {
    return {
      html: qHead("Prevuci levo ili desno", st.q) + '<div class="sort-host"></div><p class="sort-last" aria-live="polite">&nbsp;</p>',
      mount(root, api) {
        const items = U.shuffle(st.items).map((x) => ({ text: x[0], b: x[1] }));
        let right = 0; const wrong = [];
        const d = G.swipeDeck(root.querySelector(".sort-host"), items, {
          left: st.left, right: st.right,
          onAnswer(it, side) {
            const ok = side === it.b; if (ok) right++; else wrong.push(it);
            ok ? sfx.ok() : sfx.bad();
            root.querySelector(".sort-last").innerHTML = (ok ? '<span class="ok">' + icon("check") : '<span class="bad">' + icon("close")) + esc(it.text) + " → <b>" + esc(it.b ? st.right : st.left) + "</b></span>";
            return ok;
          },
          onEnd() {
            api.answer(right / items.length, { correct: wrong.length ? "Pogrešno: " + wrong.map((w) => esc(w.text) + " → <b>" + esc(w.b ? st.right : st.left) + "</b>").join(" · ") : "" });
          }
        });
        K.pospremi(() => d.destroy());
      }
    };
  },
  hotspot(st) {
    const d = A.diagram(st.art);
    return {
      html: '<p class="eyebrow q-k">' + esc(st.q) + '</p><h2 class="q hs-q">' + esc(st.ask[0].q) + '</h2><div class="art plate dg hs">' + d.svg() + '</div><p class="hs-msg" aria-live="polite">&nbsp;</p>',
      mount(root, api) {
        let k = 0, firstTry = 0, missed = false;
        root.querySelector(".dg").addEventListener("click", (e) => {
          const p = e.target.closest(".part"); if (!p || K.odgovoreno()) return;
          const want = st.ask[k].part, msg = root.querySelector(".hs-msg");
          if (p.dataset.part === want) {
            if (!missed) firstTry++;
            missed = false; sfx.ok();
            p.classList.add("found");
            const l = root.querySelector('.lbl[data-for="' + want + '"]'); if (l) l.classList.add("show");
            const part = d.parts.find((x) => x.id === want);
            msg.innerHTML = '<span class="ok">' + icon("check") + esc(part.label) + "</span>";
            k++;
            if (k < st.ask.length) root.querySelector(".hs-q").textContent = st.ask[k].q;
            else api.answer(firstTry / st.ask.length, { correct: firstTry < st.ask.length ? "Iz prvog pokušaja: <b>" + firstTry + "/" + st.ask.length + "</b>" : "" });
          } else {
            missed = true; sfx.bad();
            p.classList.add("miss"); setTimeout(() => p.classList.remove("miss"), 450);
            const part = d.parts.find((x) => x.id === p.dataset.part);
            msg.innerHTML = '<span class="bad">' + icon("close") + "To je " + esc(part ? part.label.replace(/^\d · /, "") : "drugi deo").toLowerCase() + ". Probaj ponovo.</span>";
          }
        });
      }
    };
  }
};
