// @ts-nocheck -- preneto iz artifacta (design/artifact/core.js); tipovi se dodaju postepeno.
// Pomoćne funkcije, zvuk (WebAudio, bez fajlova) i konfete. Napredak i kod sertifikata su na serveru.

  /* ---------- pomoćne ---------- */
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }
  /* srpska množina: 1 zrno · 2 zrna · 5 zrna */
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (b === 1 && a !== 11) return one;
    if (b >= 2 && b <= 4 && (a < 12 || a > 14)) return few;
    return many;
  }
  const num = (x, d = 0) => Number(x).toFixed(d).replace(".", ",");
  const reduced = typeof window === "undefined" ? false : (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();

  /* ---------- datumi ---------- */
  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dayDiff(a, b) {
    if (!a || !b) return 999;
    const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }
  const EPOCH = Date.UTC(2026, 0, 1);
  function dayNum(d) {
    d = d || new Date();
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000);
  }
  function fmtDay(n) {
    const d = new Date(EPOCH + n * 86400000);
    return d.getUTCDate() + "." + (d.getUTCMonth() + 1) + "." + d.getUTCFullYear() + ".";
  }

  /* ---------- zvuk (WebAudio, bez fajlova) ---------- */
  const sfx = (() => {
    let ctx = null, on = true, noiseBuf = null;
    function ac() {
      if (!ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        try { ctx = new C(); } catch (e) { return null; }
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    }
    function tone(freq, dur, type, vol, when, slide) {
      if (!on) return;
      const c = ac(); if (!c) return;
      const t = c.currentTime + (when || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + dur + 0.03);
    }
    function noise(c) {
      if (!noiseBuf) {
        noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return noiseBuf;
    }
    const silent = { set() {}, stop() {} };
    /* neprekidno šištanje: para ili mlaz */
    function hiss(freq, q) {
      if (!on) return silent;
      const c = ac(); if (!c) return silent;
      const src = c.createBufferSource(); src.buffer = noise(c); src.loop = true;
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 2500; f.Q.value = q || 0.7;
      const g = c.createGain(); g.gain.value = 0.0001;
      src.connect(f).connect(g).connect(c.destination); src.start();
      let dead = false;
      return {
        set(level, fr) {
          if (dead) return;
          const t = c.currentTime;
          g.gain.setTargetAtTime(Math.max(0.0001, level), t, 0.06);
          if (fr) f.frequency.setTargetAtTime(fr, t, 0.1);
        },
        stop() {
          if (dead) return; dead = true;
          const t = c.currentTime;
          g.gain.setTargetAtTime(0.0001, t, 0.05);
          try { src.stop(t + 0.35); } catch (e) { /* već zaustavljen */ }
        }
      };
    }
    return {
      get on() { return on; },
      set on(v) { on = !!v; },
      unlock() { if (on) ac(); },
      tap() { tone(540, 0.05, "triangle", 0.05); },
      ok() { tone(660, 0.09, "triangle", 0.11); tone(990, 0.16, "triangle", 0.11, 0.08); },
      bad() { tone(220, 0.2, "sawtooth", 0.05, 0, 130); },
      combo(n) { tone(700 + Math.min(n, 10) * 45, 0.08, "square", 0.04); },
      swish() { tone(900, 0.12, "sine", 0.04, 0, 300); },
      win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, "triangle", 0.1, i * 0.09)); },
      tick() { tone(1200, 0.03, "square", 0.025); },
      hiss
    };
  })();

  /* ---------- konfete u obliku zrna kafe ---------- */
  const confetti = (() => {
    let cv = null, ctx = null, parts = [], raf = 0;
    const colors = ["#6E3B21", "#F4AE3D", "#D7263D", "#1E9A5D", "#3A1E10", "#A9BF76", "#2D6FD6"];
    function burst(n) {
      if (reduced) return;
      if (!cv) {
        cv = document.createElement("canvas");
        cv.className = "confetti";
        cv.setAttribute("aria-hidden", "true");
        document.body.appendChild(cv);
        ctx = cv.getContext("2d");
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < (n || 80); i++) {
        parts.push({
          x: innerWidth / 2 + (Math.random() - 0.5) * 140, y: innerHeight * 0.38,
          vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 12 - 4,
          r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
          s: 5 + Math.random() * 5, c: colors[i % colors.length], life: 0
        });
      }
      if (!raf) raf = requestAnimationFrame(step);
    }
    function step() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.3; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.68, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.3; ctx.beginPath();
        ctx.moveTo(-p.s * 0.75, 0); ctx.quadraticCurveTo(0, p.s * 0.4, p.s * 0.75, 0); ctx.stroke();
        ctx.restore();
      }
      parts = parts.filter((p) => p.y < innerHeight + 40 && p.life < 420);
      if (parts.length) raf = requestAnimationFrame(step);
      else { raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
    return { burst };
  })();

  /* boje teme za canvas crteže */
  function colors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => cs.getPropertyValue(n).trim();
    return {
      ink: g("--ink"), ink2: g("--ink-2"), ink3: g("--ink-3"), surface: g("--surface"), surface2: g("--surface-2"),
      line: g("--line"), gold: g("--gold"), cherry: g("--cherry"), leaf: g("--leaf"), sky: g("--sky"), plate: g("--plate"), bg: g("--bg")
    };
  }

export { esc, md, clamp, lerp, shuffle, plural, num, reduced, today, dayDiff, colors, sfx, confetti };
