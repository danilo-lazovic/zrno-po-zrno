/* Zrno po zrno – animirani klipovi i mini-igre. */
(function () {
  const Z = window.ZPZ, U = Z.u, A = Z.art, sfx = Z.sfx;
  const icon = A.icon, esc = U.esc, clamp = U.clamp, num = U.num;
  const INK = "#241510";
  const TAU = Math.PI * 2;

  /* ---------- canvas pomoćne ---------- */
  function makeCanvas(host, W, H) {
    const cv = document.createElement("canvas");
    const k = 2.5;
    cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    cv.style.aspectRatio = W + " / " + H;
    host.appendChild(cv);
    const ctx = cv.getContext("2d");
    ctx.setTransform(k, 0, 0, k, 0, 0);
    return { cv, ctx, W, H };
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function hex(c) { c = c.replace("#", ""); return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)); }
  function mix(a, b, t) { const x = hex(a), y = hex(b); t = clamp(t, 0, 1); return "rgb(" + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",") + ")"; }
  function txt(ctx, s, x, y, size, color, align, weight, fam) {
    ctx.font = (weight || 800) + " " + size + "px " + (fam || "'Big Shoulders Display', 'Arial Narrow', sans-serif");
    ctx.fillStyle = color || INK; ctx.textAlign = align || "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y);
  }
  const MONO = "'Martian Mono', ui-monospace, monospace";
  const BODY = "Onest, system-ui, sans-serif";
  function lcd(ctx, x, y, w, h, big, small) {
    ctx.fillStyle = "#1C1612"; rr(ctx, x, y, w, h, 9); ctx.fill();
    txt(ctx, big, x + w / 2, y + h * 0.56, 15, "#9FE3B0", "center", 600, MONO);
    txt(ctx, small, x + w / 2, y + h - 9, 8, "#6FAF80", "center", 600, MONO);
  }
  const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

  /* ---------- scena: espresso šot (klip i igra) ---------- */
  function drawShot(ctx, s) {
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    const gh = ctx.createLinearGradient(104, 0, 256, 0);
    gh.addColorStop(0, "#8E979F"); gh.addColorStop(0.45, "#E9EDF0"); gh.addColorStop(1, "#8E979F");
    ctx.fillStyle = gh; rr(ctx, 104, -12, 152, 44, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#B9C1C8"; ctx.beginPath(); ctx.moveTo(122, 32); ctx.lineTo(238, 32); ctx.lineTo(226, 54); ctx.lineTo(134, 54); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3A2416"; rr(ctx, 12, 36, 114, 14, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#9AA3AC"; rr(ctx, 160, 54, 40, 9, 3); ctx.fill(); ctx.stroke();
    rr(ctx, 165, 61, 8, 10, 2); ctx.fill(); ctx.stroke(); rr(ctx, 187, 61, 8, 10, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2B2826"; rr(ctx, 98, 196, 164, 20, 6); ctx.fill(); ctx.stroke();
    const glass = () => { ctx.beginPath(); ctx.moveTo(146, 112); ctx.lineTo(214, 112); ctx.lineTo(208, 189); ctx.quadraticCurveTo(207, 196, 200, 196); ctx.lineTo(160, 196); ctx.quadraticCurveTo(153, 196, 152, 189); ctx.closePath(); };
    const level = clamp(s.fill, 0, 1), top = 190 - level * 66;
    ctx.fillStyle = "rgba(255,255,255,.6)"; glass(); ctx.fill();
    if (level > 0.01) {
      ctx.save(); glass(); ctx.clip();
      ctx.fillStyle = "#2E140A"; ctx.fillRect(140, top, 80, 200 - top);
      ctx.fillStyle = "#6B3A1E"; ctx.fillRect(140, top + 5, 80, (196 - top) * 0.42);
      ctx.fillStyle = "#C98A4B"; ctx.fillRect(140, top, 80, Math.min(7, 196 - top));
      ctx.restore();
    }
    if (s.flow > 0) {
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.3 + s.flow * 2.4;
      [169, 191].forEach((x, i) => {
        const w = Math.sin(s.sim * 17 + i * 2) * 0.9;
        ctx.beginPath(); ctx.moveTo(x, 71); ctx.quadraticCurveTo(x + w, (71 + top) / 2, x + w * 0.5 + (i ? -1.5 : 1.5), top); ctx.stroke();
      });
    }
    if (s.drip) {
      ctx.fillStyle = s.color || "#3E1D0C";
      for (let k = 0; k < 2; k++) { const y = 72 + ((s.sim * 70 + k * 24) % Math.max(10, top - 72)); circle(ctx, 169 + k * 22, y, 1.8); ctx.fill(); }
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; glass(); ctx.stroke();
    lcd(ctx, 276, 44, 78, 54, num(s.grams, 1) + " g", "VAGA");
    lcd(ctx, 276, 108, 78, 54, Math.floor(s.sim) + " s", "VREME");
  }

  /* ---------- scena: mleko (klip i igra) ---------- */
  function drawMilk(ctx, s) {
    const tipX = 192, tipY = 112;
    const surf = tipY - s.depth * 26;
    const foamH = s.foam * 22;
    const by = surf + 58 + foamH, topY = by - 132;
    const pitcher = () => {
      ctx.beginPath(); ctx.moveTo(104, topY - 8); ctx.lineTo(126, topY + 4); ctx.lineTo(112, by - 9);
      ctx.quadraticCurveTo(112, by, 121, by); ctx.lineTo(243, by); ctx.quadraticCurveTo(252, by, 252, by - 9);
      ctx.lineTo(238, topY); ctx.closePath();
    };
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = INK; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(244, topY + 22); ctx.bezierCurveTo(286, topY + 26, 286, by - 46, 246, by - 40); ctx.stroke();
    const g = ctx.createLinearGradient(112, 0, 252, 0);
    g.addColorStop(0, "#AEB7BF"); g.addColorStop(0.35, "#EEF1F4"); g.addColorStop(1, "#97A0A8");
    ctx.fillStyle = g; pitcher(); ctx.fill();
    ctx.save(); pitcher(); ctx.clip();
    ctx.fillStyle = "#FBF7F0"; ctx.fillRect(100, surf, 160, by - surf + 4);
    if (foamH > 0.5) {
      ctx.fillStyle = s.texture > 0.5 ? "#FFFFFF" : "#F6F1EA"; ctx.fillRect(100, surf, 160, foamH);
      if (s.big > 0.12) {
        ctx.strokeStyle = "rgba(36,21,16,.35)"; ctx.lineWidth = 1.2;
        for (let i = 0; i < 16 * s.big; i++) { circle(ctx, 120 + ((i * 47) % 120), surf + 3 + ((i * 13) % Math.max(3, foamH - 4)), 2.5 + (i % 3) * 1.6); ctx.stroke(); }
      } else if (s.texture < 0.5) {
        ctx.fillStyle = "rgba(36,21,16,.12)";
        for (let i = 0; i < 26; i++) { circle(ctx, 118 + ((i * 53) % 124), surf + 2 + ((i * 7) % Math.max(2, foamH - 2)), 1); ctx.fill(); }
      }
    }
    if (s.texture > 0.4) { ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(130, surf + 2, 60 * s.texture, 2.5); }
    if (s.swirl) {
      ctx.strokeStyle = "rgba(36,21,16,.28)"; ctx.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) {
        const a = s.t * 7 + k * 2.1;
        ctx.beginPath(); ctx.ellipse(180, surf + 26 + k * 9, 52 - k * 10, 9 - k * 2, 0, a, a + 2.4); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; pitcher(); ctx.stroke();
    if (s.steam) {
      for (let k = 0; k < 6; k++) {
        const ph = (s.t * 0.9 + k / 6) % 1;
        ctx.fillStyle = "rgba(160,170,180," + (0.35 * (1 - ph)).toFixed(3) + ")";
        circle(ctx, 176 + Math.sin(k * 2 + s.t * 2) * 14, topY - 4 - ph * 60, 6 + ph * 10); ctx.fill();
      }
      if (s.depth > -0.3 && s.depth < 0.2) {
        ctx.fillStyle = "rgba(255,255,255,.95)";
        for (let k = 0; k < 5; k++) { circle(ctx, tipX - 14 + ((s.t * 90 + k * 13) % 28), surf - 2 - ((k * 3 + s.t * 30) % 5), 1.6); ctx.fill(); }
      }
    }
    ctx.strokeStyle = "#A3ACB4"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(352, -6); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.fillStyle = "#5E676F"; circle(ctx, tipX, tipY, 4.5); ctx.fill();
    // termometar
    const tx = 318, ty0 = 46, ty1 = 214, tt = clamp(s.temp, 0, 80);
    ctx.fillStyle = "#FFFFFF"; rr(ctx, tx, ty0, 16, ty1 - ty0, 8); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    const yOf = (v) => ty1 - 6 - (v / 80) * (ty1 - ty0 - 12);
    ctx.fillStyle = "rgba(30,154,93,.28)"; ctx.fillRect(tx + 2, yOf(65), 12, yOf(55) - yOf(65));
    ctx.fillStyle = tt > 66 ? "#D7263D" : "#F2661C"; rr(ctx, tx + 4, yOf(tt), 8, ty1 - 6 - yOf(tt), 4); ctx.fill();
    txt(ctx, Math.round(tt) + " °C", tx + 8, ty0 - 8, 11, s.ink || INK, "center", 600, MONO);
  }

  /* ---------- scena: latte art odozgo (klip i igra) ---------- */
  function heartPts(r, m, push) {
    const pts = [], N = 84, k = r / 15.5;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * TAU;
      const cxp = Math.sin(th) * r, cyp = -Math.cos(th) * r * (1 + push * 0.12) + push * 4;
      const hx = 16 * Math.pow(Math.sin(th), 3) * k;
      const hy = (-(13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) - 2.5) * k;
      pts.push([cxp + (hx - cxp) * m, cyp + (hy - cyp) * m]);
    }
    return pts;
  }
  function drawLatte(ctx, s) {
    const cx = 150, cy = 150;
    ctx.lineWidth = 2; ctx.strokeStyle = INK;
    ctx.fillStyle = "#F3EFEB"; circle(ctx, cx, cy, 142); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; rr(ctx, cx + 112, cy - 15, 34, 30, 12); ctx.fill(); ctx.stroke();
    circle(ctx, cx, cy, 122); ctx.fill(); ctx.stroke();
    const f = clamp(s.fill, 0, 1.08);
    if (f > 1) { ctx.fillStyle = "rgba(126,64,25,.35)"; circle(ctx, cx + 30, cy + 118, 24); ctx.fill(); }
    const R = 60 + 46 * Math.min(1, f);
    const gr = ctx.createRadialGradient(cx, cy - 10, 10, cx, cy, R);
    gr.addColorStop(0, mix("#C47A3A", "#D9A06A", f * 0.45)); gr.addColorStop(1, mix("#7E4019", "#9A5A2C", f * 0.4));
    ctx.fillStyle = gr; circle(ctx, cx, cy, R); ctx.fill();
    if (s.dot > 0.5) {
      const pts = heartPts(s.dot, s.heart || 0, s.push || 0);
      ctx.fillStyle = "#FFF8EE"; ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(cx + p[0], cy - 4 + p[1]) : ctx.moveTo(cx + p[0], cy - 4 + p[1])));
      ctx.closePath(); ctx.fill();
    }
    if (s.cut > 0 && s.cut < 1) {
      const y0 = cy - 4 - s.dot - 18, y1 = y0 + (s.dot * 2 + 40) * s.cut;
      ctx.strokeStyle = "#8A4A1E"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke();
    }
    if (s.pour) {
      ctx.fillStyle = "rgba(255,248,238,.95)"; circle(ctx, cx, cy - 6, s.high ? 3 : 6); ctx.fill();
      ctx.strokeStyle = "rgba(255,248,238,.55)"; ctx.lineWidth = 1.5;
      const rp = 9 + ((s.t || 0) * 26) % 16; circle(ctx, cx, cy - 6, rp); ctx.stroke();
    }
    if (s.ring) {
      ctx.setLineDash([4, 5]); ctx.strokeStyle = "rgba(255,248,238,.9)"; ctx.lineWidth = 2;
      circle(ctx, cx, cy - 4, s.ring[0]); ctx.stroke(); circle(ctx, cx, cy - 4, s.ring[1]); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  /* ---------- KLIPOVI ---------- */
  const CLIPS = {
    shot: {
      W: 360, H: 230, dur: 14,
      caps: [[0, 1.8, "Tajmer i vaga kreću od nule."], [1.8, 4.2, "Predinfuzija: kolač se natapa, još nema kapi."], [4.2, 9.2, "Prve kapi su tamne i guste."], [9.2, 12.7, "Mlaz kao mišji rep, boja ide ka karamel."], [12.7, 99, "STOP na 40 g za 28 s. Razmera 1:2."]],
      draw(ctx, t) {
        const sim = Math.min(t * 2.2, 28), ft = clamp((sim - 4) / 24, 0, 1);
        const grams = 40 * Math.pow(ft, 1.1);
        const on = t * 2.2 < 28 && sim > 4;
        const color = ft < 0.6 ? mix("#3E1D0C", "#A0612A", ft / 0.6) : mix("#A0612A", "#D9A35B", (ft - 0.6) / 0.4);
        drawShot(ctx, { sim, grams, fill: grams / 40 * 0.8, flow: on ? 0.55 + 0.45 * ft : 0, color, drip: sim > 3.3 && sim < 4.3 });
        if (t > 12.8) {
          ctx.save(); ctx.translate(70, 150); ctx.rotate(-0.12);
          ctx.fillStyle = "#F4AE3D"; rr(ctx, -40, -20, 80, 40, 10); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
          txt(ctx, "1 : 2", 0, 11, 28, INK); ctx.restore();
        }
      }
    },
    silos: {
      W: 360, H: 230, dur: 9,
      caps: [[0, 2.6, "Ista količina vode ide u oba silosa."], [2.6, 6, "Kroz zrna voda proleti: između njih ima mnogo prostora."], [6, 99, "Kroz sitnu kafu ide polako. Sitnije = sporije, krupnije = brže."]],
      draw(ctx, t, W, H, C) {
        const top = 46, bot = 148, sides = [{ x: 40, fast: true }, { x: 210, fast: false }];
        sides.forEach((sd) => {
          const x = sd.x, w = 110, mid = x + w / 2;
          const shape = () => { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w, bot); ctx.lineTo(mid + 9, bot + 20); ctx.lineTo(mid - 9, bot + 20); ctx.lineTo(x, bot); ctx.closePath(); };
          ctx.fillStyle = "#F3F5F7"; shape(); ctx.fill();
          ctx.save(); shape(); ctx.clip();
          if (sd.fast) {
            for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) {
              const bx = x + 10 + c * 18 + (r % 2) * 9, byy = top + 10 + r * 16;
              ctx.fillStyle = "#6E3B21"; ctx.beginPath(); ctx.ellipse(bx, byy, 8, 5.5, (r + c) % 2 ? 0.5 : -0.5, 0, TAU); ctx.fill();
            }
          } else {
            ctx.fillStyle = "#7A4A2A"; ctx.fillRect(x, top + 2, w, bot - top + 18);
            ctx.fillStyle = "rgba(255,255,255,.18)";
            for (let i = 0; i < 160; i++) { ctx.fillRect(x + ((i * 37) % w), top + 4 + ((i * 53) % (bot - top + 10)), 1.2, 1.2); }
          }
          ctx.restore();
          ctx.strokeStyle = INK; ctx.lineWidth = 2.5; shape(); ctx.stroke();
          let got = 0;
          for (let k = 0; k < 24; k++) {
            const age = t - k * 0.22; if (age < 0) continue;
            let y;
            if (sd.fast) y = 16 + age * 170;
            else {
              const tIn = (top - 16) / 170;
              if (age < tIn) y = 16 + age * 170;
              else { const inside = (age - tIn) * 24; y = inside < bot + 20 - top ? top + inside : bot + 20 + (age - tIn - (bot + 20 - top) / 24) * 170; }
            }
            if (y > 188) { got++; continue; }
            ctx.fillStyle = "#2D6FD6"; ctx.beginPath(); ctx.moveTo(mid + ((k * 13) % 30) - 15, y - 6);
            ctx.quadraticCurveTo(mid + ((k * 13) % 30) - 11, y + 2, mid + ((k * 13) % 30) - 15, y + 3);
            ctx.quadraticCurveTo(mid + ((k * 13) % 30) - 19, y + 2, mid + ((k * 13) % 30) - 15, y - 6); ctx.fill();
          }
          ctx.fillStyle = "#FFFFFF"; rr(ctx, mid - 26, 190, 52, 32, 6); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
          const lv = Math.min(28, got * 1.25);
          ctx.fillStyle = "#4A2414"; rr(ctx, mid - 24, 220 - lv, 48, lv, 4); if (lv > 1) ctx.fill();
          txt(ctx, sd.fast ? "ZRNA" : "SITNO MLEVENO", mid, 34, 17, C.ink);
        });
      }
    },
    preinf: {
      W: 360, H: 220, dur: 10,
      caps: [[0, 4, "Levo: niski pritisak (~3 bara) polako natapa ceo kolač."], [4, 7, "Desno: pun pritisak odmah. Voda nalazi prečicu."], [7, 99, "Kanal znači neravnomernu ekstrakciju. Predinfuzija to sprečava."]],
      draw(ctx, t, W, H, C) {
        [95, 265].forEach((cx, side) => {
          const L = cx - 66, R = cx + 66;
          const basket = () => { ctx.beginPath(); ctx.moveTo(L, 58); ctx.lineTo(R, 58); ctx.lineTo(R - 6, 122); ctx.quadraticCurveTo(R - 8, 132, R - 18, 132); ctx.lineTo(L + 18, 132); ctx.quadraticCurveTo(L + 8, 132, L + 6, 122); ctx.closePath(); };
          ctx.fillStyle = "#C9CFD5"; basket(); ctx.fill();
          ctx.save(); basket(); ctx.clip();
          ctx.fillStyle = "#9FC3F0"; ctx.fillRect(L, 60, 132, 18);
          ctx.fillStyle = "#8A5A36"; ctx.fillRect(L, 78, 132, 54);
          ctx.fillStyle = "rgba(36,21,16,.15)"; for (let i = 0; i < 70; i++) ctx.fillRect(L + ((i * 41) % 130), 80 + ((i * 17) % 50), 1.6, 1.6);
          if (side === 0) {
            const w = clamp(t / 4.5, 0, 1); ctx.fillStyle = "rgba(46,20,10,.55)"; ctx.fillRect(L, 78, 132, 54 * w);
          } else {
            const ch = clamp((t - 0.6) / 1.2, 0, 1);
            if (ch > 0) {
              ctx.fillStyle = "rgba(46,20,10,.4)"; ctx.fillRect(cx - 4 - ch * 10, 78, 8 + ch * 20, 54 * ch);
              ctx.strokeStyle = "#F2E2C4"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 2, 78);
              for (let k = 1; k <= 6; k++) ctx.lineTo(cx + (k % 2 ? -5 : 5), 78 + Math.min(54 * ch, k * 9)); ctx.stroke();
            }
          }
          ctx.restore();
          ctx.strokeStyle = INK; ctx.lineWidth = 2.5; basket(); ctx.stroke();
          ctx.fillStyle = "#9AA3AC"; rr(ctx, cx - 10, 132, 20, 10, 3); ctx.fill(); ctx.stroke();
          const flowing = side === 0 ? t > 4.6 : t > 1.9;
          if (flowing) {
            ctx.strokeStyle = side === 0 ? "#B9772F" : "#E9CF9C"; ctx.lineWidth = side === 0 ? 4 : 2;
            ctx.beginPath(); ctx.moveTo(cx, 142); ctx.lineTo(cx + Math.sin(t * 20) * (side ? 1.5 : 0.6), 196); ctx.stroke();
          }
          txt(ctx, side === 0 ? "PREDINFUZIJA" : "KANALISANJE", cx, 36, 19, side === 0 ? C.leaf : C.cherry);
          txt(ctx, side === 0 ? "~3 bara, pa 9" : "odmah 9 bara", cx, 214, 11, C.ink2, "center", 600, MONO);
        });
      }
    },
    v60: {
      W: 360, H: 230, dur: 15,
      caps: [[0, 2.1, "1. nalivanje · 50 g, od sredine ka spolja"], [2.1, 4.3, "2. nalivanje · 100 g"], [4.3, 6.4, "3. nalivanje · 150 g"], [6.4, 8.6, "4. nalivanje · 200 g"], [8.6, 10.7, "5. nalivanje · 250 g"], [10.7, 99, "Kafa procuri. Ukupno 3:30–5:00."]],
      draw(ctx, t) {
        const sim = Math.min(t * 14, 210);
        let grams = 0, pour = -1, tp = 0;
        for (let k = 0; k < 5; k++) {
          const s0 = k * 30;
          if (sim >= s0 + 10) grams += 50;
          else if (sim > s0) { grams += 50 * (sim - s0) / 10; pour = k; tp = (sim - s0) / 10; }
        }
        const cx = 140, cy = 115;
        ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
        ctx.fillStyle = "#FFFFFF"; circle(ctx, cx, cy, 98); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#D9DEE3"; ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 74, cy + Math.sin(a) * 74);
          ctx.quadraticCurveTo(cx + Math.cos(a + 0.3) * 86, cy + Math.sin(a + 0.3) * 86, cx + Math.cos(a + 0.5) * 94, cy + Math.sin(a + 0.5) * 94); ctx.stroke();
        }
        const wet = clamp(grams / 60, 0, 1), dry = sim > 150 ? clamp((sim - 150) / 60, 0, 1) : 0;
        ctx.fillStyle = mix(mix("#8A5A36", "#4A2414", wet), "#5C3018", dry * 0.6); circle(ctx, cx, cy, 70); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        if (pour >= 0) {
          ctx.fillStyle = "rgba(255,255,255,.35)";
          for (let i = 0; i < 10; i++) { circle(ctx, cx + Math.cos(i * 2.4) * (12 + i * 5), cy + Math.sin(i * 2.4) * (12 + i * 5), 2 + (i % 3)); ctx.fill(); }
          const rad = 48 * Math.sin(Math.PI * tp), ang = tp * TAU * 3;
          const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
          ctx.fillStyle = "#9FC3F0"; circle(ctx, px, py, 6.5); ctx.fill();
          ctx.strokeStyle = "rgba(159,195,240,.8)"; ctx.lineWidth = 1.5; circle(ctx, px, py, 10 + (t * 30) % 10); ctx.stroke();
        }
        lcd(ctx, 268, 44, 84, 54, Math.round(grams) + " g", "VAGA");
        lcd(ctx, 268, 108, 84, 54, mmss(sim), "VREME");
      }
    },
    milk: {
      W: 360, H: 250, dur: 10,
      caps: [[0, 4.2, "Faza 1: vrh na površini. Ulazi vazduh, čuje se tiho šištanje."], [4.2, 9, "Faza 2: potopi vrh. Vrtlog spaja penu i mleko i greje ga."], [9, 99, "Sjajna mikropena, bez krupnih mehurića."]],
      draw(ctx, t, W, H, C) {
        const depth = t < 4.2 ? 0.02 : t < 4.8 ? 0.02 + (t - 4.2) / 0.6 * 0.6 : 0.62;
        drawMilk(ctx, {
          t, depth, steam: t < 9, swirl: t > 4.6 && t < 9.4,
          foam: clamp(t / 4.2, 0, 1) * 0.36, texture: clamp((t - 4.6) / 4.2, 0, 1), big: 0,
          temp: 6 + clamp(t / 9, 0, 1) * 54, ink: C.ink
        });
      }
    },
    heart: {
      W: 300, H: 300, dur: 12,
      caps: [[0, 3, "1. Osnova do pola šolje, sa visine."], [3, 6, "2. Spusti latijeru blizu površine i sipaj tačku."], [6, 8.4, "3. Uspori protok dok dolivaš."], [8.4, 10, "4. Podigni latijeru i preseci kroz tačku."], [10, 99, "Srce!"]],
      draw(ctx, t) {
        const s = { t, fill: 0, dot: 0, push: 0, cut: 0, heart: 0, pour: false, high: false };
        if (t < 3) { s.fill = (t / 3) * 0.5; s.pour = true; s.high = true; }
        else if (t < 6) { s.fill = 0.5 + ((t - 3) / 3) * 0.15; s.dot = clamp((t - 3.4) / 2.6, 0, 1) * 32; s.pour = true; }
        else if (t < 8.4) { const k = (t - 6) / 2.4; s.fill = 0.65 + k * 0.27; s.dot = 32 + k * 6; s.push = k; s.pour = true; }
        else { const k = clamp((t - 8.4) / 1.6, 0, 1); s.fill = 0.92; s.dot = 38; s.push = 1 - k; s.cut = k < 1 ? k : 0; s.heart = k; }
        drawLatte(ctx, s);
      }
    }
  };

  function clip(host, id) {
    const def = CLIPS[id];
    if (!def) { host.textContent = ""; return { destroy() {} }; }
    host.innerHTML = '<div class="clip"><div class="clip-stage plate"></div>' +
      '<p class="clip-cap" aria-live="polite"></p><div class="clip-ctrl"><button type="button" class="icon-btn clip-play" aria-label="Pauza"></button>' +
      '<div class="clip-bar" aria-hidden="true"><i></i></div><span class="clip-time"></span></div></div>';
    const stage = host.querySelector(".clip-stage"), cap = host.querySelector(".clip-cap"), btn = host.querySelector(".clip-play");
    const bar = host.querySelector(".clip-bar i"), tm = host.querySelector(".clip-time");
    const { ctx, W, H } = makeCanvas(stage, def.W, def.H);
    let t = 0, playing = !U.reduced, last = 0, raf = 0, C = U.colors(), lastCap = "";
    function draw() {
      ctx.clearRect(0, 0, W, H);
      def.draw(ctx, t, W, H, C);
      const c = def.caps.find((k) => t >= k[0] && t < k[1]);
      const ct = c ? c[2] : "";
      if (ct !== lastCap) { cap.textContent = ct; lastCap = ct; }
      bar.style.width = (t / def.dur * 100).toFixed(1) + "%";
      tm.textContent = Math.floor(t) + " / " + def.dur + " s";
      btn.innerHTML = icon(playing ? "pause" : t >= def.dur ? "replay" : "play");
      btn.setAttribute("aria-label", playing ? "Pauza" : t >= def.dur ? "Pusti ponovo" : "Pusti");
    }
    function frame(now) {
      if (!last) last = now;
      const dt = Math.min(0.064, (now - last) / 1000); last = now;
      if (playing) { t += dt; if (t >= def.dur) { t = def.dur; playing = false; } }
      draw();
      raf = playing ? requestAnimationFrame(frame) : 0;
    }
    function toggle() {
      sfx.tap();
      if (t >= def.dur) t = 0;
      playing = !playing; last = 0;
      if (playing && !raf) raf = requestAnimationFrame(frame); else draw();
    }
    btn.addEventListener("click", toggle);
    stage.addEventListener("click", toggle);
    draw();
    if (playing) raf = requestAnimationFrame(frame);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!playing) draw(); });
    return { destroy() { cancelAnimationFrame(raf); playing = false; } };
  }

  /* ---------- rezultat igre ---------- */
  function starsFor(score) { return score >= 0.9 ? 3 : score >= 0.7 ? 2 : score >= 0.4 ? 1 : 0; }
  function starRow(n) {
    let h = '<span class="srow" aria-label="' + n + " od 3 zvezdice" + '">';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? "on" : "") + '">' + icon("star") + "</span>";
    return h + "</span>";
  }

  /* ---------- IGRA: Uštimaj mlin ---------- */
  const DIAL = [
    { brief: "Nova kafa u mlinu. Pusti šot i vidi šta se dešava.", g0: 8, start: 12, dose: 18 },
    { brief: "Neko je dirao mlin i nešto ne valja. Popravi šot.", g0: 10, start: 6, dose: 18 },
    { brief: "Novi recept: 20 g → 40 g. Podesi dozu, pa mlin.", g0: 9, start: 9, dose: 18, need: 20 }
  ];
  function dialin(host, opt) {
    const list = opt.mode === "lesson" ? DIAL.slice(0, 2) : DIAL;
    let si = 0, sc, g, dose, tries, pts = [], running = false, raf = 0, last = 0, sim = 0, grams = 0, flow = 0, hiss = null, hist = [], done = false;
    host.innerHTML =
      '<div class="game dial"><div class="g-head"><span class="g-step"></span><span class="g-goal"></span></div>' +
      '<p class="g-brief"></p><div class="g-stage plate"></div>' +
      '<div class="dial-ctrls"><div class="ctrl"><span class="ctrl-l">Mlin</span><div class="stepper">' +
      '<button type="button" data-g="-1" aria-label="Sitnije, ka FINE">' + icon("back") + "FINE</button><output class=\"o-g\"></output>" +
      '<button type="button" data-g="1" aria-label="Krupnije, ka COARSE">COARSE' + icon("next") + "</button></div></div>" +
      '<div class="ctrl ctrl-dose"><span class="ctrl-l">Doza</span><div class="stepper">' +
      '<button type="button" data-d="-0.5" aria-label="Manje kafe">−</button><output class="o-d"></output><button type="button" data-d="0.5" aria-label="Više kafe">+</button></div></div></div>' +
      '<div class="taste" aria-hidden="true"><i class="needle"></i></div><div class="taste-l" aria-hidden="true"><span>kiselo</span><span>balans</span><span>gorko</span></div>' +
      '<div class="g-msg" aria-live="polite"></div><div class="g-hist"></div>' +
      '<div class="g-btns"><button type="button" class="btn btn-gold btn-big g-go">Pusti šot</button></div></div>';
    const $ = (s) => host.querySelector(s);
    const { ctx, W, H } = makeCanvas($(".g-stage"), 360, 230);
    const go = $(".g-go");
    function flowOf() { return 1.5 * Math.pow(1.17, g - sc.g0) * Math.pow(18 / dose, 1.3) * (1 + (Math.random() - 0.5) * 0.05); }
    function rate(t) { return t < 4 ? 0 : flow * (1 + 0.15 * clamp((t - 4) / 25, 0, 1)); }
    function timeTo(target) { let t = 0, y = 0; while (y < target && t < 90) { y += rate(t) * 0.05; t += 0.05; } return t; }
    function setup() {
      sc = list[si]; g = sc.start; dose = sc.dose; tries = 0; hist = [];
      $(".g-step").textContent = "Šot " + (si + 1) + "/" + list.length;
      $(".g-brief").textContent = sc.brief;
      $(".ctrl-dose").hidden = !sc.need;
      $(".g-msg").textContent = ""; $(".g-msg").className = "g-msg";
      $(".g-hist").innerHTML = "";
      $(".needle").style.setProperty("--p", 0.5); $(".taste").classList.remove("show");
      go.textContent = "Pusti šot"; go.className = "btn btn-gold btn-big g-go";
      sim = 0; grams = 0; upd(); paint();
    }
    function upd() {
      const want = sc.need || 18;
      $(".g-goal").textContent = "Cilj: " + want + " g → " + want * 2 + " g · 25–30 s";
      $(".o-g").textContent = g; $(".o-d").textContent = num(dose, 1) + " g";
      host.querySelectorAll(".stepper button").forEach((b) => (b.disabled = running || done));
    }
    function paint() {
      ctx.clearRect(0, 0, W, H);
      const ft = clamp((sim - 4) / 26, 0, 1);
      const color = ft < 0.6 ? mix("#3E1D0C", "#A0612A", ft / 0.6) : mix("#A0612A", "#D9A35B", (ft - 0.6) / 0.4);
      drawShot(ctx, { sim, grams, fill: grams / (dose * 2) * 0.8, flow: running && sim > 4 ? clamp(rate(sim) / 2, 0.35, 1) : 0, color, drip: running && sim > 3.3 && sim < 4.2 });
    }
    function frame(now) {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000) * 2.5; last = now;
      sim += dt; grams += rate(sim) * dt;
      if (hiss) hiss.set(sim > 4 ? 0.025 : 0.004, 700 + clamp(rate(sim), 0, 3) * 120);
      paint();
      if (grams >= dose * 3 || sim >= 60) return stop(true);
      raf = requestAnimationFrame(frame);
    }
    function start() {
      sfx.tap(); running = true; sim = 0; grams = 0; last = 0; flow = flowOf();
      hiss = sfx.hiss(800, 0.8);
      go.textContent = "Stop"; go.className = "btn btn-cherry btn-big g-go";
      $(".g-msg").textContent = "Pusti do " + (sc.need || 18) * 2 + " g, pa pritisni STOP."; $(".g-msg").className = "g-msg";
      upd(); raf = requestAnimationFrame(frame);
    }
    function stop(auto) {
      cancelAnimationFrame(raf); running = false; if (hiss) { hiss.stop(); hiss = null; }
      tries++;
      const want = sc.need || 18, target = dose * 2, t = sim, y = grams, r = y / dose, t2 = timeTo(target);
      const p = clamp((t2 - 14) / 27, 0, 1);
      $(".taste").classList.add("show"); $(".needle").style.setProperty("--p", p.toFixed(3));
      const okFlow = t2 >= 24 && t2 <= 31, okRatio = r >= 1.8 && r <= 2.2, okDose = !sc.need || Math.abs(dose - sc.need) < 0.01;
      let msg, good = false;
      if (!okDose) msg = "Recept traži " + want + " g kafe, a ti imaš " + num(dose, 1) + " g. Prvo podesi dozu.";
      else if (!okFlow) msg = t2 < 24
        ? "Prebrzo: do " + num(target, 0) + " g stiže za " + Math.round(t2) + " s. Ukus je kiseo i prazan. Pomeri mlin ka FINE."
        : "Presporo: do " + num(target, 0) + " g stiže tek za " + Math.round(t2) + " s. Ukus je gorak i opor. Pomeri mlin ka COARSE.";
      else if (!okRatio) msg = "Protok je dobar, ali si stao na " + num(y, 1) + " g (1:" + num(r, 1) + "). Zaustavi na " + num(target, 0) + " g." + (auto ? " Predugo si pustio." : "");
      else { msg = "Savršeno! " + Math.round(t) + " s · " + num(y, 1) + " g · 1:" + num(r, 1) + ". Slatko i balansirano."; good = true; }
      hist.push('<span class="chip-s ' + (good ? "ok" : "") + '">#' + tries + " · mlin " + g + " · " + Math.round(t) + " s · " + num(y, 1) + " g</span>");
      $(".g-hist").innerHTML = hist.slice(-4).join("");
      const m = $(".g-msg"); m.textContent = msg; m.className = "g-msg " + (good ? "ok" : "bad");
      if (good) {
        sfx.ok();
        pts.push(tries <= 2 ? 1 : tries <= 4 ? 0.75 : 0.5);
        if (opt.onWin) opt.onWin();
        if (si < list.length - 1) { go.textContent = "Sledeći šot"; go.className = "btn btn-gold btn-big g-go"; go.dataset.next = "1"; }
        else finish();
      } else {
        sfx.bad();
        go.textContent = "Pusti ponovo"; go.className = "btn btn-gold btn-big g-go";
        if (tries >= 6 && !host.querySelector(".g-skip")) {
          const b = document.createElement("button"); b.type = "button"; b.className = "btn btn-ghost g-skip"; b.textContent = "Preskoči ovaj šot";
          b.addEventListener("click", () => { pts.push(0.2); b.remove(); if (si < list.length - 1) { si++; setup(); } else finish(); });
          $(".g-btns").appendChild(b);
        }
      }
      upd();
    }
    function finish() {
      done = true;
      const score = pts.reduce((a, b) => a + b, 0) / list.length, st = starsFor(score);
      go.hidden = true; const sk = host.querySelector(".g-skip"); if (sk) sk.remove();
      const res = document.createElement("div"); res.className = "g-res";
      res.innerHTML = starRow(st) + "<p><b>Mlin uštiman!</b> Rešio si " + pts.filter((x) => x > 0.2).length + " od " + list.length + " šota.</p>";
      host.querySelector(".game").appendChild(res);
      upd();
      opt.onDone && opt.onDone({ score, stars: st });
    }
    host.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || b.disabled) return;
      if (b.dataset.g) { g = clamp(g + Number(b.dataset.g), 1, 20); sfx.tick(); upd(); }
      else if (b.dataset.d) { dose = clamp(dose + Number(b.dataset.d), 14, 24); sfx.tick(); upd(); paint(); }
      else if (b.classList.contains("g-go")) {
        if (running) stop(false);
        else if (b.dataset.next) { delete b.dataset.next; si++; setup(); }
        else start();
      }
    });
    setup();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
    return { destroy() { cancelAnimationFrame(raf); if (hiss) hiss.stop(); } };
  }

  /* ---------- IGRA: Stimuj mleko ---------- */
  function milk(host, opt) {
    host.innerHTML =
      '<div class="game milk"><div class="g-head"><span>Kralj pare</span><span class="g-goal">Cilj: pena, vrtlog, stop na 55–65 °C</span></div>' +
      '<p class="g-brief">Uključi paru. Vrh drži na površini dok ne uđe dovoljno vazduha, pa ga potopi za vrtlog. Isključi paru u zelenoj zoni.</p>' +
      '<div class="g-stage plate milk-stage"></div>' +
      '<label class="rng" for="milk-depth"><span class="ctrl-l">Vrh stimera (ili prevuci latijeru gore-dole)</span>' +
      '<input type="range" id="milk-depth" min="-100" max="100" value="-45"><span class="rng-l" aria-hidden="true"><i>iznad</i><i>površina</i><i>duboko</i></span></label>' +
      '<div class="mbars"><div class="mbar"><span>Pena</span><b><i class="mb-foam"></i><em class="mb-zone"></em></b></div>' +
      '<div class="mbar"><span>Spajanje</span><b><i class="mb-tex"></i></b></div>' +
      '<div class="mbar warn"><span>Krupni mehurići</span><b><i class="mb-big"></i></b></div></div>' +
      '<div class="g-msg" aria-live="polite"></div><div class="g-btns"><button type="button" class="btn btn-gold btn-big g-go">Uključi paru</button></div></div>';
    const $ = (s) => host.querySelector(s);
    const stage = $(".milk-stage"), rng = $("#milk-depth"), go = $(".g-go"), msg = $(".g-msg");
    const { cv, ctx, W, H } = makeCanvas(stage, 360, 250);
    let s, raf = 0, last = 0, hiss = null, hint = "", C = U.colors(), finished = false;
    function reset() {
      s = { t: 0, depth: -0.45, foam: 0, texture: 0, big: 0, temp: 5, steam: false, swirl: false };
      rng.value = -45; finished = false; msg.textContent = ""; msg.className = "g-msg";
      const r = host.querySelector(".g-res"); if (r) r.remove();
      go.textContent = "Uključi paru"; go.className = "btn btn-gold btn-big g-go"; go.hidden = false;
    }
    function zone() { return s.depth < -0.3 ? "air" : s.depth <= 0.2 ? "surf" : "deep"; }
    function frame(now) {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      s.t += dt;
      if (s.steam) {
        const z = zone(); let h;
        s.temp += 3.6 * dt;
        if (z === "air") { s.big = clamp(s.big + 0.42 * dt, 0, 1); s.foam = clamp(s.foam + 0.1 * dt, 0, 1); h = "Previsoko! Prave se krupni mehurići. Spusti vrh do površine."; }
        else if (z === "surf") { s.foam = clamp(s.foam + 0.12 * dt, 0, 1); h = s.foam < 0.24 ? "Tako! Vrh na površini, ulazi vazduh." : "Dosta vazduha. Sad potopi vrh za vrtlog."; }
        else { if (s.foam > 0.04) s.texture = clamp(s.texture + 0.17 * dt, 0, 1); s.big = clamp(s.big - 0.05 * dt, 0, 1); h = s.foam < 0.12 ? "Potopljeno, ali bez vazduha nema pene." : "Vrtlog spaja penu i mleko."; }
        s.swirl = z === "deep";
        if (h !== hint) { hint = h; msg.textContent = h; msg.className = "g-msg"; }
        if (hiss) hiss.set(z === "air" ? 0.07 : z === "surf" ? 0.045 : 0.02, z === "air" ? 4200 : z === "surf" ? 2600 : 600);
        if (s.temp >= 72) return end(true);
      }
      paint();
      raf = requestAnimationFrame(frame);
    }
    function paint() {
      ctx.clearRect(0, 0, W, H);
      drawMilk(ctx, Object.assign({ ink: C.ink }, s));
      $(".mb-foam").style.width = (s.foam * 100).toFixed(0) + "%";
      $(".mb-tex").style.width = (s.texture * 100).toFixed(0) + "%";
      $(".mb-big").style.width = (s.big * 100).toFixed(0) + "%";
    }
    function end(scorched) {
      s.steam = false; s.swirl = false; if (hiss) { hiss.stop(); hiss = null; }
      finished = true;
      const checks = [
        [s.foam >= 0.22 && s.foam <= 0.55, s.foam < 0.22 ? "Premalo vazduha: tanka pena." : s.foam > 0.55 ? "Previše vazduha: pena je kruta." : "Taman vazduha."],
        [s.texture >= 0.6, s.texture >= 0.6 ? "Pena i mleko su spojeni." : "Malo vrtloga: pena i mleko nisu spojeni."],
        [s.big < 0.25, s.big < 0.25 ? "Bez krupnih mehurića." : "Krupni mehurići: vrh je bio previsoko."],
        [!scorched && s.temp >= 55 && s.temp <= 66, scorched || s.temp > 66 ? "Prevruće: mleko je pregorelo." : s.temp < 55 ? "Prehladno: isključio si paru prerano." : "Temperatura je u zelenoj zoni."]
      ];
      const okN = checks.filter((c) => c[0]).length, st = okN === 4 ? 3 : okN === 3 ? 2 : okN === 2 ? 1 : 0;
      st >= 2 ? sfx.ok() : sfx.bad();
      const res = document.createElement("div"); res.className = "g-res";
      res.innerHTML = starRow(st) + '<ul class="checks">' + checks.map((c) => '<li class="' + (c[0] ? "ok" : "bad") + '">' + icon(c[0] ? "check" : "close") + esc(c[1]) + "</li>").join("") + "</ul>";
      host.querySelector(".game").insertBefore(res, host.querySelector(".g-btns"));
      msg.textContent = ""; go.textContent = "Probaj ponovo"; go.className = "btn btn-ghost btn-big g-go";
      paint();
      opt.onDone && opt.onDone({ score: okN / 4, stars: st });
    }
    go.addEventListener("click", () => {
      if (finished) { reset(); paint(); return; }
      if (!s.steam) { s.steam = true; hint = ""; hiss = sfx.hiss(2600, 0.6); go.textContent = "Isključi paru"; go.className = "btn btn-cherry btn-big g-go"; sfx.tap(); }
      else end(false);
    });
    rng.addEventListener("input", () => { s.depth = rng.value / 100; if (!s.steam) paint(); });
    let drag = null;
    cv.addEventListener("pointerdown", (e) => { drag = { y: e.clientY, d: s.depth }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const k = 2.2 / cv.getBoundingClientRect().height;
      s.depth = clamp(drag.d + (drag.y - e.clientY) * k, -1, 1);
      rng.value = Math.round(s.depth * 100);
    });
    const up = () => { drag = null; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    reset(); paint();
    raf = requestAnimationFrame(frame);
    return { destroy() { cancelAnimationFrame(raf); if (hiss) hiss.stop(); } };
  }

  /* ---------- IGRA: Sipaj srce ---------- */
  function latte(host, opt) {
    const STEPS = [
      { t: "Osnova", brief: "Drži dugme i sipaj espresso sa mlekom sa visine. Pusti kad je šolja do pola (zelena zona)." },
      { t: "Tačka", brief: "Latijera je sad blizu površine. Drži da sipaš belu tačku i pusti kad stigne do isprekidanog kruga." },
      { t: "Uspori i dolij", brief: "Drži da doliješ šolju. Pusti pre nego što se prelije (zelena zona)." },
      { t: "Preseci", brief: "Prevuci prstom kroz tačku odozgo nadole. Ili pritisni dugme Preseci." }
    ];
    host.innerHTML =
      '<div class="game latte"><div class="g-head"><span class="g-step"></span><span class="g-goal">Srce</span></div>' +
      '<p class="g-brief"></p><div class="latte-wrap"><div class="g-stage plate latte-stage"></div><div class="fillg" aria-hidden="true"><i class="fz"></i><i class="fl"></i></div></div>' +
      '<div class="lsteps" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="g-msg" aria-live="polite"></div>' +
      '<div class="g-btns"><button type="button" class="btn btn-gold btn-big g-hold">Drži za sipanje</button></div></div>';
    const $ = (sel) => host.querySelector(sel);
    const stage = $(".latte-stage"), btn = $(".g-hold"), msg = $(".g-msg");
    const { cv, ctx, W, H } = makeCanvas(stage, 300, 300);
    let st, step, holding = false, raf = 0, last = 0, sc, hiss = null, anim = null;
    function reset() {
      st = { t: 0, fill: 0, dot: 0, push: 0, cut: 0, heart: 0, pour: false, high: true, ring: null };
      step = 0; sc = []; holding = false; anim = null;
      const r = host.querySelector(".g-res"); if (r) r.remove();
      btn.hidden = false; btn.className = "btn btn-gold btn-big g-hold";
      setStep();
    }
    function setStep() {
      $(".g-step").textContent = "Korak " + (step + 1) + "/4 · " + STEPS[step].t;
      $(".g-brief").textContent = STEPS[step].brief;
      host.querySelectorAll(".lsteps i").forEach((el, i) => el.className = i < step ? "done" : i === step ? "on" : "");
      btn.textContent = step === 3 ? "Preseci" : "Drži za sipanje";
      st.ring = step === 1 ? [30, 38] : null;
      st.high = step === 0;
      const zone = step === 0 ? [0.45, 0.6] : step === 2 ? [0.85, 0.97] : null;
      const fz = $(".fz"); fz.hidden = !zone;
      if (zone) { fz.style.bottom = (zone[0] * 100) + "%"; fz.style.height = ((zone[1] - zone[0]) * 100) + "%"; }
    }
    function paint() { ctx.clearRect(0, 0, W, H); drawLatte(ctx, st); $(".fl").style.height = (Math.min(1, st.fill) * 100).toFixed(1) + "%"; }
    function frame(now) {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; st.t += dt;
      if (holding) {
        if (step === 0) st.fill += 0.3 * dt;
        else if (step === 1) { st.dot += 15 * dt; st.fill += 0.05 * dt; }
        else if (step === 2) { st.fill += 0.14 * dt; st.dot += 3 * dt; st.push = clamp(st.push + 0.4 * dt, 0, 1); }
        if (st.fill >= 1.06 || st.dot > 60) release();
      }
      if (anim) {
        anim.k = clamp(anim.k + dt / 0.9, 0, 1);
        st.cut = anim.k < 1 ? anim.k : 0; st.heart = anim.k * anim.q; st.push = (1 - anim.k) * st.push;
        if (anim.k >= 1) { anim = null; finish(); }
      }
      paint();
      raf = requestAnimationFrame(frame);
    }
    function press() {
      if (step > 2 || holding) return;
      holding = true; st.pour = true; hiss = sfx.hiss(900, 0.9); hiss.set(0.035);
    }
    function release() {
      if (!holding) return;
      holding = false; st.pour = false; if (hiss) { hiss.stop(); hiss = null; }
      let s, m;
      if (step === 0) {
        const f = st.fill; s = f >= 0.45 && f <= 0.6 ? 1 : Math.abs(f - 0.525) < 0.18 ? 0.6 : 0.25;
        m = s === 1 ? "Osnova je taman, do pola šolje." : f < 0.45 ? "Premalo osnove. Nalivaš do pola šolje." : "Previše osnove: nema mesta za crtež.";
      } else if (step === 1) {
        const d = st.dot; s = d >= 30 && d <= 38 ? 1 : d >= 24 && d <= 46 ? 0.6 : 0.25;
        m = s === 1 ? "Lepa, okrugla tačka!" : d < 30 ? "Tačka je mala: srce će biti sitno." : "Tačka je prevelika.";
      } else {
        const f = st.fill; s = f >= 0.85 && f <= 0.97 ? 1 : f > 1 ? 0 : f >= 0.75 ? 0.6 : 0.3;
        m = f > 1 ? "Prelilo se! Uspori ranije." : s === 1 ? "Šolja je puna, a crtež ceo." : "Šolja nije dovoljno puna.";
        st.fill = Math.min(st.fill, 1.04);
      }
      sc.push(s); s >= 0.6 ? sfx.ok() : sfx.bad();
      msg.textContent = m; msg.className = "g-msg " + (s === 1 ? "ok" : s >= 0.6 ? "" : "bad");
      step++; setStep();
    }
    function cut(q) {
      if (step !== 3 || anim) return;
      sc.push(q); sfx.swish();
      const quality = sc.reduce((a, b) => a + b, 0) / sc.length;
      anim = { k: 0, q: 0.55 + 0.45 * quality };
      btn.hidden = true;
    }
    function finish() {
      const score = sc.reduce((a, b) => a + b, 0) / 4, stars = starsFor(score);
      stars >= 2 ? sfx.win() : sfx.ok();
      $(".g-step").textContent = "Gotovo";
      $(".g-brief").textContent = stars === 3 ? "Osnova, tačka, dolivanje i presek: sve na mestu." : "Probaj ponovo i prati zelene zone na merilu desno.";
      const res = document.createElement("div"); res.className = "g-res";
      res.innerHTML = starRow(stars) + "<p><b>" + (stars === 3 ? "Savršeno srce!" : stars === 2 ? "Lepo srce!" : "Srce je tu, vežbaj još.") + "</b></p>";
      host.querySelector(".game").insertBefore(res, host.querySelector(".g-btns"));
      msg.textContent = "";
      btn.hidden = false; btn.textContent = "Probaj ponovo"; btn.className = "btn btn-ghost btn-big g-hold"; step = 4;
      opt.onDone && opt.onDone({ score, stars });
    }
    btn.addEventListener("pointerdown", (e) => { if (step <= 2) { e.preventDefault(); btn.setPointerCapture(e.pointerId); press(); } });
    btn.addEventListener("pointerup", () => release());
    btn.addEventListener("pointercancel", () => release());
    btn.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && step <= 2 && !e.repeat) { e.preventDefault(); press(); } });
    btn.addEventListener("keyup", (e) => { if ((e.key === " " || e.key === "Enter") && step <= 2) { e.preventDefault(); release(); } });
    btn.addEventListener("click", () => { if (step === 3) cut(0.7); else if (step === 4) { reset(); } });
    let sw = null;
    cv.addEventListener("pointerdown", (e) => { if (step === 3) { const r = cv.getBoundingClientRect(); sw = { x: e.clientX, y: e.clientY, r }; cv.setPointerCapture(e.pointerId); } });
    cv.addEventListener("pointerup", (e) => {
      if (!sw) return;
      const dy = e.clientY - sw.y, dx = e.clientX - sw.x, midX = ((sw.x + e.clientX) / 2 - sw.r.left) / sw.r.width * 300;
      if (dy > sw.r.height * 0.18) cut(clamp(1 - Math.abs(midX - 150) / 60 - Math.abs(dx) / sw.r.width, 0.3, 1));
      sw = null;
    });
    reset(); paint(); raf = requestAnimationFrame(frame);
    return { destroy() { cancelAnimationFrame(raf); if (hiss) hiss.stop(); } };
  }

  /* ---------- IGRA: Složi recept ---------- */
  function recipe(host, opt) {
    const list = U.shuffle(Z.RECIPES).slice(0, opt.mode === "lesson" ? 2 : 3);
    let ri = 0, total = 0, perfect = 0, checked = false;
    function render() {
      const r = list[ri], fields = Z.RECIPE_FIELDS.filter((f) => r.f[f.k]);
      checked = false;
      host.innerHTML = '<div class="game recipe"><div class="g-head"><span>Recept ' + (ri + 1) + "/" + list.length + '</span><span class="g-goal">Po jedna vrednost u redu</span></div>' +
        '<div class="rc"><div class="rc-head"><span class="rc-img' + (r.dark ? " dark" : "") + '"><img src="' + r.img + '" alt="' + esc(r.name) + '" loading="lazy"></span><div><span class="eyebrow">Recept iz skripte</span><h3 class="h3">' + esc(r.name) + "</h3></div></div>" +
        fields.map((f) => '<div class="rc-row" data-k="' + f.k + '"><b>' + esc(f.t) + '</b><div class="rc-opts">' +
          f.opts.map((o) => '<button type="button" class="rc-opt" data-v="' + esc(o) + '">' + esc(o) + "</button>").join("") + "</div></div>").join("") +
        '</div><div class="g-msg" aria-live="polite"></div><div class="g-btns"><button type="button" class="btn btn-gold btn-big g-go" disabled>Proveri recept</button></div></div>';
    }
    host.addEventListener("click", (e) => {
      const o = e.target.closest(".rc-opt"), go = e.target.closest(".g-go");
      const r = list[ri];
      if (o && !checked) {
        o.parentNode.querySelectorAll(".rc-opt").forEach((x) => x.classList.toggle("sel", x === o));
        sfx.tap();
        const rows = host.querySelectorAll(".rc-row");
        host.querySelector(".g-go").disabled = ![...rows].every((row) => row.querySelector(".sel"));
      } else if (go && !go.disabled) {
        if (!checked) {
          checked = true;
          let ok = 0; const rows = host.querySelectorAll(".rc-row");
          rows.forEach((row) => {
            const want = r.f[row.dataset.k], sel = row.querySelector(".sel");
            row.querySelectorAll(".rc-opt").forEach((x) => { if (x.dataset.v === want) x.classList.add("ok"); });
            if (sel.dataset.v === want) ok++; else sel.classList.add("bad");
          });
          const frac = ok / rows.length; total += frac; if (ok === rows.length) perfect++;
          ok === rows.length ? sfx.ok() : sfx.bad();
          const m = host.querySelector(".g-msg");
          m.textContent = ok === rows.length ? "Recept je tačan!" : "Tačno: " + ok + " od " + rows.length + ". Zeleno je ono što piše u skripti.";
          m.className = "g-msg " + (ok === rows.length ? "ok" : "bad");
          go.textContent = ri < list.length - 1 ? "Sledeći recept" : "Završi";
        } else if (ri < list.length - 1) { ri++; render(); }
        else {
          const score = total / list.length, st = starsFor(score);
          const res = document.createElement("div"); res.className = "g-res";
          res.innerHTML = starRow(st) + "<p><b>" + perfect + " od " + list.length + "</b> recepata bez greške.</p>";
          go.replaceWith(res);
          opt.onDone && opt.onDone({ score, stars: st, perfect });
        }
      }
    });
    render();
    return { destroy() {} };
  }

  /* ---------- špil za prevlačenje (sortiranje i Brza runda) ---------- */
  function swipeDeck(host, items, opt) {
    host.innerHTML = '<div class="deck" style="--lc:' + (opt.lc || "var(--sky)") + ";--rc:" + (opt.rc || "var(--gold-2)") + '"><div class="deck-stack"></div>' +
      '<div class="deck-btns"><button type="button" class="btn deck-l">' + icon("back") + "<span>" + esc(opt.left) + '</span></button><button type="button" class="btn deck-r"><span>' + esc(opt.right) + "</span>" + icon("next") + "</button></div></div>";
    const stack = host.querySelector(".deck-stack"), deck = host.querySelector(".deck");
    let i = 0, busy = false, dead = false;
    function render() {
      stack.innerHTML = "";
      for (let k = Math.min(items.length - 1, i + 2); k >= i; k--) {
        const c = document.createElement("div");
        c.className = "swcard"; c.style.setProperty("--k", k - i);
        c.innerHTML = '<p class="swcard-txt">' + esc(items[k].text) + '</p><span class="stamp stamp-l">' + esc(opt.left) + '</span><span class="stamp stamp-r">' + esc(opt.right) + "</span>";
        if (k === i) { c.tabIndex = -1; c.setAttribute("aria-live", "polite"); }
        stack.appendChild(c);
      }
      const top = stack.lastElementChild; if (top) drag(top);
    }
    function commit(side) {
      if (busy || dead || i >= items.length) return;
      busy = true;
      const top = stack.lastElementChild, item = items[i];
      const ok = opt.onAnswer(item, side);
      deck.classList.remove("flash-ok", "flash-bad"); void deck.offsetWidth;
      deck.classList.add(ok ? "flash-ok" : "flash-bad");
      if (top) {
        top.style.transition = "transform .28s ease-in, opacity .28s";
        top.style.transform = "translateX(" + (side ? 520 : -520) + "px) rotate(" + (side ? 24 : -24) + "deg)";
        top.style.opacity = "0";
      }
      setTimeout(() => {
        busy = false; i++;
        if (dead) return;
        if (i >= items.length) { stack.innerHTML = ""; opt.onEnd && opt.onEnd(); } else render();
      }, U.reduced ? 60 : 260);
    }
    function drag(el) {
      let sx = 0, dx = 0, on = false;
      el.addEventListener("pointerdown", (e) => { if (busy) return; on = true; sx = e.clientX; dx = 0; el.setPointerCapture(e.pointerId); el.style.transition = "none"; });
      el.addEventListener("pointermove", (e) => {
        if (!on) return; dx = e.clientX - sx;
        el.style.transform = "translateX(" + dx + "px) rotate(" + dx / 16 + "deg)";
        el.style.setProperty("--sl", clamp(-dx / 90, 0, 1)); el.style.setProperty("--sr", clamp(dx / 90, 0, 1));
      });
      const end = () => {
        if (!on) return; on = false;
        if (Math.abs(dx) > 80) commit(dx > 0 ? 1 : 0);
        else { el.style.transition = "transform .2s"; el.style.transform = ""; el.style.setProperty("--sl", 0); el.style.setProperty("--sr", 0); }
      };
      el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
    }
    host.querySelector(".deck-l").addEventListener("click", () => commit(0));
    host.querySelector(".deck-r").addEventListener("click", () => commit(1));
    function key(e) { if (e.key === "ArrowLeft") { e.preventDefault(); commit(0); } else if (e.key === "ArrowRight") { e.preventDefault(); commit(1); } }
    document.addEventListener("keydown", key);
    render();
    return { destroy() { dead = true; document.removeEventListener("keydown", key); } };
  }

  /* ---------- IGRA: Brza runda ---------- */
  function swipeGame(host, opt) {
    const items = U.shuffle(opt.items).map((x) => ({ text: x[0], a: x[1] }));
    let score = 0, combo = 0, answered = 0, right = 0, wrong = [], left = 60, timer = 0, deck = null, over = false;
    host.innerHTML = '<div class="game swipe"><div class="sw-top"><div class="sw-time" aria-hidden="true"><i></i></div><span class="sw-clock">60 s</span><span class="sw-score">' + icon("bean") + "<b>0</b></span></div>" +
      '<p class="sw-combo" aria-live="polite">&nbsp;</p><div class="sw-deck"></div><p class="sw-hint">Desno = tačno · levo = netačno. Strelice na tastaturi rade.</p></div>';
    const $ = (s) => host.querySelector(s);
    deck = swipeDeck($(".sw-deck"), items, {
      left: "Netačno", right: "Tačno", lc: "var(--cherry)", rc: "var(--leaf)",
      onAnswer(item, side) {
        answered++;
        const ok = (side === 1) === item.a;
        if (ok) {
          right++; combo++; score += 1 + (combo % 5 === 0 ? 2 : 0);
          combo >= 3 ? sfx.combo(combo) : sfx.ok();
          $(".sw-combo").textContent = combo >= 3 ? combo + " zaredom!" + (combo % 5 === 0 ? " +2 bonus" : "") : " ";
        } else { combo = 0; wrong.push(item); sfx.bad(); $(".sw-combo").textContent = " "; }
        $(".sw-score b").textContent = score;
        return ok;
      },
      onEnd() { end(); }
    });
    timer = setInterval(() => {
      left--; $(".sw-clock").textContent = left + " s";
      $(".sw-time i").style.width = (left / 60 * 100) + "%";
      if (left <= 5 && left > 0) sfx.tick();
      if (left <= 0) end();
    }, 1000);
    function end() {
      if (over) return; over = true;
      clearInterval(timer); deck.destroy();
      sfx.win();
      const acc = answered ? Math.round(right / answered * 100) : 0;
      $(".sw-deck").innerHTML = '<div class="g-res"><p class="big-num">' + score + '</p><p>poena · ' + right + "/" + answered + " tačno (" + acc + "%)</p>" +
        (wrong.length ? '<div class="miss"><p class="eyebrow">Proveri ove</p><ul>' + wrong.slice(0, 6).map((w) => "<li><b>" + (w.a ? "Tačno" : "Netačno") + ":</b> " + esc(w.text) + "</li>").join("") + "</ul></div>" : "") + "</div>";
      $(".sw-hint").textContent = "";
      opt.onDone && opt.onDone({ score: answered ? right / answered : 0, points: score, stars: starsFor(answered ? right / answered : 0) });
    }
    return { destroy() { over = true; clearInterval(timer); deck && deck.destroy(); } };
  }

  Z.games = { clip, dialin, milk, latte, recipe, swipeDeck, swipeGame, starRow, starsFor };
})();
