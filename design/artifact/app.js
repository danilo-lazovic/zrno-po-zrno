/* Zrno po zrno – aplikacija: stanje, ekrani, lekcije, završni test, profil, panel za trenere. */
(function () {
  const Z = window.ZPZ, U = Z.u, A = Z.art, G = Z.games, sfx = Z.sfx;
  const esc = U.esc, md = U.md, icon = A.icon;
  const MODS = Z.MODULES;
  const modById = (id) => MODS.find((m) => m.id === id);
  const QTYPES = ["mc", "tf", "num", "order", "match", "sort", "hotspot", "game"];
  const app = document.getElementById("app");
  const ov = document.getElementById("ov");

  let S = null;          // stanje, čuva se samo na ovom uređaju
  let tab = "put";
  let L = null;          // aktivna lekcija ili test
  let cleanups = [];     // gašenje aktivnih klipova i igara
  let cardsMode = "kartice", cardIdx = 0, cardFilter = "all";

  /* ---------- stanje ---------- */
  function defaults() {
    return {
      v: 1, name: "", avatar: "zrno", xp: 0,
      streak: { n: 0, best: 0, last: "" }, daily: { d: "", xp: 0 },
      mods: {}, games: {}, badges: {}, exam: { best: 0, passed: null, tries: 0 },
      known: {}, sound: true, onboarded: false, preview: false, recipesPerfect: 0
    };
  }
  function loadState() {
    const raw = Z.store.load() || {};
    const d = defaults();
    const s = Object.assign(d, raw);
    s.streak = Object.assign(defaults().streak, raw.streak || {});
    s.daily = Object.assign(defaults().daily, raw.daily || {});
    s.exam = Object.assign(defaults().exam, raw.exam || {});
    return s;
  }
  const persist = () => Z.store.save(S);
  const doneMod = (id) => !!(S.mods[id] && S.mods[id].done);
  const doneCount = () => MODS.filter((m) => doneMod(m.id)).length;
  const allDone = () => doneCount() === MODS.length;
  const isUnlocked = (i) => S.preview || i === 0 || doneMod(MODS[i - 1].id);
  function currentIndex() {
    for (let i = 0; i < MODS.length; i++) if (!doneMod(MODS[i].id) && isUnlocked(i)) return i;
    return -1;
  }
  function rankOf(xp) {
    let i = 0;
    Z.RANKS.forEach((r, k) => { if (xp >= r.min) i = k; });
    return Object.assign({ i }, Z.RANKS[i]);
  }
  const days = (n) => n + " " + U.plural(n, "dan", "dana", "dana");
  const beans = (n) => n + " " + U.plural(n, "zrno", "zrna", "zrna");

  /* ---------- zrna, niz dana, bedževi ---------- */
  function gain(n) {
    if (!(n > 0)) return;
    const t = U.today();
    if (S.daily.d !== t) S.daily = { d: t, xp: 0 };
    S.daily.xp += n;
    if (S.streak.last !== t) {
      S.streak.n = U.dayDiff(S.streak.last, t) === 1 ? S.streak.n + 1 : 1;
      S.streak.last = t;
      S.streak.best = Math.max(S.streak.best, S.streak.n);
      if (S.streak.n >= 3) award("streak3");
    }
    const before = rankOf(S.xp).i;
    S.xp += n;
    const r = rankOf(S.xp);
    if (r.i > before) { toast(icon("star") + "<span>Novi rang: <b>" + esc(r.t) + "</b></span>", "gold", true); Z.confetti.burst(60); }
    persist(); refreshTop();
  }
  function award(id) {
    if (S.badges[id]) return;
    S.badges[id] = U.today(); persist();
    const b = Z.BADGES.find((x) => x.id === id);
    if (b) { toast(A.medal(id, true) + "<span>Novi bedž: <b>" + esc(b.t) + "</b></span>", "badge", true); sfx.win(); }
  }

  /* ---------- obaveštenja ---------- */
  const toastQ = []; let toastBusy = false;
  function toast(html, kind, isHtml) { toastQ.push([html, kind, isHtml]); if (!toastBusy) nextToast(); }
  function nextToast() {
    const it = toastQ.shift();
    if (!it) { toastBusy = false; return; }
    toastBusy = true;
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    if (it[2]) el.innerHTML = it[0]; else el.textContent = it[0];
    el.className = "toast" + (it[1] ? " toast-" + it[1] : "");
    void el.offsetWidth; el.classList.add("show");
    setTimeout(() => { el.classList.remove("show"); setTimeout(nextToast, 260); }, 2400);
  }

  /* ---------- donji list (sheet) ---------- */
  function sheet(html, onClick) {
    closeSheet();
    const w = document.createElement("div");
    w.className = "sheet-wrap";
    w.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(w);
    w.addEventListener("click", (e) => {
      if (e.target === w || e.target.closest("[data-act=sheet-close]")) { closeSheet(); return; }
      onClick && onClick(e);
    });
    const f = w.querySelector("button, input"); if (f) f.focus({ preventScroll: true });
    return w;
  }
  function closeSheet() { const w = document.querySelector(".sheet-wrap"); if (w) w.remove(); }

  function destroyAll() { cleanups.forEach((f) => { try { f(); } catch (e) { /* već ugašeno */ } }); cleanups = []; }

  /* ---------- glavni okvir ---------- */
  const TABS = [["put", "Put", "path"], ["igre", "Igre", "arcade"], ["kartice", "Kartice", "cards"], ["profil", "Profil", "user"]];
  function topbar() {
    const r = rankOf(S.xp);
    return '<header class="top"><button type="button" class="top-me" data-tab="profil" aria-label="Profil">' + A.avatar(S.avatar) +
      '<span class="top-rank"><small>' + esc(S.name || "Barista") + "</small><b>" + esc(r.t) + "</b></span></button>" +
      '<div class="top-stats"><span class="stat flame" title="Dani zaredom">' + icon("flame") + "<b>" + S.streak.n + "</b></span>" +
      '<span class="stat bean" title="Zrna">' + icon("bean") + "<b>" + S.xp + "</b></span>" +
      '<button type="button" class="icon-btn" data-act="sound" aria-label="' + (S.sound ? "Isključi zvuk" : "Uključi zvuk") + '">' + icon(S.sound ? "sound" : "mute") + "</button></div></header>";
  }
  function refreshTop() { const h = app.querySelector(".top"); if (h) h.outerHTML = topbar(); }
  function tabbar() {
    return '<nav class="tabs" aria-label="Glavni meni">' + TABS.map((t) =>
      '<button type="button" data-tab="' + t[0] + '" class="' + (tab === t[0] ? "on" : "") + '"' + (tab === t[0] ? ' aria-current="page"' : "") + ">" + icon(t[2]) + "<span>" + t[1] + "</span></button>").join("") + "</nav>";
  }
  function render() {
    destroyAll(); closeSheet();
    const screens = { put: putScreen, igre: igreScreen, kartice: karticeScreen, profil: profilScreen, trener: trenerScreen };
    app.innerHTML = topbar() + '<main id="view" class="view view-' + tab + '">' + (screens[tab] || putScreen)() + "</main>" + tabbar();
    if (tab === "put") requestAnimationFrame(drawTrail);
    if (tab === "kartice" && cardsMode === "kartice") mountFlash();
  }
  function go(t) { tab = t; sfx.tap(); render(); window.scrollTo(0, 0); }

  /* ---------- PUT ---------- */
  const XS = [0, -1, 0, 1, 0, -1, 0, 1];
  function putScreen() {
    const r = rankOf(S.xp), nr = Z.RANKS[r.i + 1];
    const rp = nr ? (S.xp - r.min) / (nr.min - r.min) : 1;
    const dxp = S.daily.d === U.today() ? S.daily.xp : 0, gp = Math.min(1, dxp / Z.DAILY_GOAL);
    const ci = currentIndex(), cur = ci >= 0 ? MODS[ci] : null, dn = doneCount();
    const C = 2 * Math.PI * 21;
    let cont;
    if (cur) cont = '<button type="button" class="btn btn-gold btn-big" data-start="' + cur.id + '">' + (dn ? "Nastavi" : "Počni") + " · Nivo " + cur.n + "</button>";
    else if (!S.exam.passed) cont = '<button type="button" class="btn btn-gold btn-big" data-act="exam-intro">Završni test</button>';
    else cont = '<button type="button" class="btn btn-big" data-tab="profil">Pogledaj sertifikat</button>';
    const dots = MODS.map((m) => '<i class="' + (doneMod(m.id) ? "on" : "") + '"></i>').join("") + '<i class="trophy ' + (S.exam.passed ? "on" : "") + '">' + icon("trophy") + "</i>";
    let h = '<section class="put">' +
      '<div class="hello card"><div class="hello-row"><div class="hello-txt"><p class="eyebrow">Zdravo, ' + esc(S.name || "barista") + "</p>" +
      '<h1 class="h1">Minimum za kurs</h1><div class="mdots" aria-label="' + dn + ' od 8 nivoa">' + dots + "</div>" +
      '<p class="sub">' + dn + " od 8 nivoa · " + (S.exam.passed ? "test položen" : allDone() ? "test te čeka" : "test na kraju") + "</p></div>" +
      '<div class="ring" title="Dnevni cilj"><svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="21" class="ring-bg"/><circle cx="25" cy="25" r="21" class="ring-fg" style="stroke-dasharray:' + C.toFixed(1) + ";stroke-dashoffset:" + (C * (1 - gp)).toFixed(1) + '"/></svg>' +
      (gp >= 1 ? '<span class="ring-done">' + icon("check") + "<small>cilj</small></span>" : "<span><b>" + dxp + "</b>/" + Z.DAILY_GOAL + "</span>") + "</div></div>" +
      '<div class="roast-row"><span class="mono-s">' + esc(r.t) + '</span><div class="roast" aria-hidden="true"><i style="width:' + (rp * 100).toFixed(1) + '%"></i></div><span class="mono-s">' + (nr ? esc(nr.t) : "max") + "</span></div>" +
      '<p class="hello-foot">' + (nr ? "Još " + beans(nr.min - S.xp) + " do ranga „" + esc(nr.t) + "“" : "Najviši rang!") + " · " + days(S.streak.n) + " zaredom</p></div>" +
      cont + '<div class="trail"><svg class="trail-line" aria-hidden="true"></svg>';
    let gi = 0;
    Z.PARTS.forEach((p) => {
      h += '<div class="part-banner"><span>' + esc(p.title) + "</span></div>";
      p.mods.forEach((id) => { const i = MODS.findIndex((m) => m.id === id); h += nodeHTML(MODS[i], i, ci, gi++); });
    });
    const fin = allDone() || S.preview;
    h += '<div class="part-banner"><span>Finale</span></div><div class="node-wrap final"><button type="button" class="node node-final ' + (S.exam.passed ? "is-done" : fin ? "is-current" : "is-locked") + '" data-act="exam-intro" aria-label="Završni test">' +
      icon(fin ? "trophy" : "lock") + '</button><div class="node-meta"><b>Završni test</b><span class="node-sub">' + (S.exam.passed ? "Položen · " + S.exam.passed.score + "%" : "20 pitanja · prolaz 80%") + "</span></div></div></div></section>";
    return h;
  }
  function nodeHTML(m, i, ci) {
    const done = doneMod(m.id), unl = isUnlocked(i), cur = i === ci;
    const state = done ? "done" : cur ? "current" : unl ? "open" : "locked";
    const st = (S.mods[m.id] && S.mods[m.id].stars) || 0;
    return '<div class="node-wrap' + (cur ? ' cur' : '') + '" style="--x:' + XS[i] + '">' + (cur ? '<span class="kreni" aria-hidden="true">Kreni</span>' : "") +
      '<button type="button" class="node is-' + state + '" data-mod="' + m.id + '" aria-label="Nivo ' + m.n + ": " + esc(m.title) + (done ? ", završen" : unl ? "" : ", zaključan") + '">' +
      A.BEAN + '<span class="node-n">' + (state === "locked" ? icon("lock") : m.n) + "</span></button>" +
      '<div class="node-meta"><b>' + esc(m.title) + "</b>" + (done ? G.starRow(st) : '<span class="node-sub">' + (unl ? "~" + m.min + " min" : "Zaključano") + "</span>") + "</div></div>";
  }
  function drawTrail() {
    const trail = app.querySelector(".trail"); if (!trail) return;
    const svg = trail.querySelector(".trail-line"), tr = trail.getBoundingClientRect();
    const nodes = [...trail.querySelectorAll(".node")];
    const pts = nodes.map((n) => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2 - tr.left, r.top + r.height / 2 - tr.top]; });
    const path = (arr) => arr.map((p, i) => i ? (() => { const q = arr[i - 1], my = (q[1] + p[1]) / 2; return " C" + q[0] + " " + my + " " + p[0] + " " + my + " " + p[0] + " " + p[1]; })() : "M" + p[0] + " " + p[1]).join("");
    const dn = nodes.filter((n) => n.classList.contains("is-done")).length;
    svg.setAttribute("viewBox", "0 0 " + tr.width + " " + tr.height);
    svg.innerHTML = '<path class="tl-all" d="' + path(pts) + '"/>' + (dn > 0 ? '<path class="tl-done" d="' + path(pts.slice(0, Math.min(pts.length, dn + 1))) + '"/>' : "");
  }
  function moduleSheet(id) {
    const i = MODS.findIndex((m) => m.id === id), m = MODS[i];
    if (!isUnlocked(i)) { toast("Prvo završi nivo " + (i) + "."); sfx.bad(); return; }
    sfx.tap();
    const rec = MODS[i].steps.filter((s) => s.remember).slice(0, 4);
    const ms = S.mods[id];
    sheet('<div class="msheet" style="--mc:' + m.color + '"><div class="msheet-band">' + icon(m.icon) + "<span>Nivo " + m.n + "</span>" + (ms && ms.done ? G.starRow(ms.stars) : "") + "</div>" +
      '<h2 class="h2">' + esc(m.title) + '</h2><p class="msheet-d">' + esc(m.desc) + "</p>" +
      '<ul class="meta"><li>' + icon("clock") + "~" + m.min + " min</li><li>" + m.steps.length + " kartica</li><li>" + m.steps.filter((s) => QTYPES.includes(s.t)).length + " izazova</li></ul>" +
      '<p class="eyebrow">Šta ćeš znati</p><ul class="learn">' + rec.map((s) => "<li>" + icon("check") + "<span>" + md(s.remember) + "</span></li>").join("") + "</ul>" +
      '<button type="button" class="btn btn-gold btn-big" data-start="' + id + '">' + (ms && ms.done ? "Ponovi nivo" : "Započni") + "</button></div>",
      (e) => { const b = e.target.closest("[data-start]"); if (b) { closeSheet(); openLesson(b.dataset.start); } });
  }
  function examIntro() {
    if (!(allDone() || S.preview)) { toast("Završni test se otključava posle svih 8 nivoa."); sfx.bad(); return; }
    sfx.tap();
    const p = S.exam.passed;
    sheet('<div class="msheet" style="--mc:var(--gold)"><div class="msheet-band">' + icon("trophy") + "<span>Finale</span></div>" +
      '<h2 class="h2">Završni test</h2><p class="msheet-d">' + Z.EXAM_SIZE + " pitanja iz svih nivoa, nasumično. Za prolaz ti treba <b>" + Math.round(Z.PASS * 100) + "%</b>. Posle prolaza dobijaš sertifikat sa kodom za trenera.</p>" +
      '<ul class="meta"><li>' + icon("clock") + "~8 min</li><li>Najbolje: " + S.exam.best + "%</li><li>Pokušaja: " + S.exam.tries + "</li></ul>" +
      (p ? '<p class="note ok">' + icon("check") + "Već si položio sa " + p.score + "%. Možeš da popraviš rezultat.</p>" : "") +
      '<button type="button" class="btn btn-gold btn-big" data-act="exam-start">Kreni na test</button></div>',
      (e) => { if (e.target.closest("[data-act=exam-start]")) { closeSheet(); openLesson(null, true); } });
  }

  /* ---------- IGRE ---------- */
  const GAMES = [
    { id: "swipe", t: "Brza runda", d: "60 sekundi, tačno ili netačno. Prevlači levo-desno.", ic: "swap", after: "m1", color: "#D7263D" },
    { id: "dialin", t: "Uštimaj mlin", d: "Tri šota, tri problema. Podesi mlin i dozu.", ic: "gauge", after: "m4", color: "#7B4A2D" },
    { id: "recipe", t: "Složi recept", d: "Chemex, V60, Aeropress, French press i cold brew.", ic: "dripper", after: "m7", color: "#2B7BC0" },
    { id: "milk", t: "Kralj pare", d: "Vazduh, vrtlog i prava temperatura mleka.", ic: "pitcher", after: "m8", color: "#12807B" },
    { id: "latte", t: "Sipaj srce", d: "Osnova, tačka, dolivanje i presek.", ic: "heart", after: "m8", color: "#A86A0C" }
  ];
  const gameOpen = (g) => S.preview || doneMod(g.after);
  function igreScreen() {
    return '<section class="igre"><p class="eyebrow">Igraonica</p><h1 class="h1">Vežbaj kroz igru</h1><p class="lead">Svaka igra se otključava kad završiš nivo u kom je to gradivo. Igre donose zrna i bedževe.</p>' +
      '<div class="glist">' + GAMES.map((g) => {
        const open = gameOpen(g), rec = S.games[g.id], m = modById(g.after);
        const sub = !open ? icon("lock") + "Posle nivoa " + m.n + " · " + esc(m.title) : rec ? (g.id === "swipe" ? "Rekord: " + rec.best + " poena" : "Najbolje: " + rec.best + "%") : "Nova igra";
        return '<button type="button" class="gcard' + (open ? "" : " locked") + '" data-game="' + g.id + '"' + (open ? "" : ' aria-disabled="true"') + ">" +
          '<span class="gcard-art" style="--gc:' + g.color + '">' + icon(g.ic) + '</span><span class="gcard-txt"><b>' + g.t + "</b><span>" + g.d + "</span><small>" + sub + "</small></span>" +
          (rec && rec.stars ? G.starRow(rec.stars) : "") + "</button>";
      }).join("") + "</div></section>";
  }
  function swipePool() {
    let maxI = 0;
    MODS.forEach((m, i) => { if (doneMod(m.id) || S.preview) maxI = i + 1; });
    const list = [];
    MODS.slice(0, Math.max(1, maxI)).forEach((m) => list.push(...m.swipe));
    return list;
  }
  function recordGame(id, r, arcade) {
    const g = S.games[id] || { best: 0, stars: 0, plays: 0 };
    g.plays++;
    g.best = Math.max(g.best, id === "swipe" ? r.points || 0 : Math.round(r.score * 100));
    g.stars = Math.max(g.stars, r.stars || 0);
    S.games[id] = g;
    if (id === "swipe" && (r.points || 0) >= 15) award("swipe");
    if (id === "milk" && r.stars === 3) award("milk");
    if (id === "latte" && r.stars === 3) award("latte");
    if (id === "dialin" && r.score > 0.2) award("dial");
    if (id === "recipe") { S.recipesPerfect += r.perfect || 0; if (S.recipesPerfect >= 3) award("recipe"); }
    persist();
    if (arcade) gain(Math.round(5 + r.score * 15));
  }
  function openGame(id) {
    const g = GAMES.find((x) => x.id === id);
    if (!gameOpen(g)) { const m = modById(g.after); toast("Otključava se posle nivoa " + m.n + "."); sfx.bad(); return; }
    sfx.tap(); destroyAll();
    openOv('<div class="ls gv" style="--mc:' + g.color + '"><div class="ls-top"><button type="button" class="icon-btn" data-act="close-ov" aria-label="Zatvori">' + icon("close") + '</button><h2 class="gv-title">' + g.t + '</h2><span class="ls-xp">' + icon("bean") + "<b>" + S.xp + "</b></span></div>" +
      '<div class="ls-body"><div class="game-host"></div></div><div class="ls-foot"><button type="button" class="btn btn-big" data-act="replay" hidden>Igraj ponovo</button><button type="button" class="btn btn-ghost" data-act="close-ov">Nazad u igraonicu</button></div></div>');
    const host = ov.querySelector(".game-host");
    const fn = { swipe: "swipeGame", dialin: "dialin", recipe: "recipe", milk: "milk", latte: "latte" }[id];
    const inst = G[fn](host, {
      mode: "arcade", items: id === "swipe" ? swipePool() : null,
      onWin: () => award("dial"),
      onDone: (r) => {
        recordGame(id, r, true);
        const xb = ov.querySelector(".ls-xp b"); if (xb) xb.textContent = S.xp;
        const rp = ov.querySelector("[data-act=replay]"); if (rp && (id === "swipe" || id === "dialin" || id === "recipe")) rp.hidden = false;
        if (r.stars === 3) Z.confetti.burst(70);
      }
    });
    cleanups.push(() => inst.destroy());
    ov.dataset.game = id;
  }

  /* ---------- KARTICE ---------- */
  function cardList() { return Z.GLOSSARY.filter((g) => cardFilter === "all" || g[0] === cardFilter); }
  function karticeScreen() {
    const seg = '<div class="seg" role="group" aria-label="Prikaz"><button type="button" data-cmode="kartice" aria-pressed="' + (cardsMode === "kartice") + '">Kartice</button><button type="button" data-cmode="minimum" aria-pressed="' + (cardsMode === "minimum") + '">Minimum lista</button></div>';
    if (cardsMode === "minimum") {
      return '<section class="kartice"><p class="eyebrow">Učionica</p><h1 class="h1">Šta moraš da znaš</h1>' + seg +
        '<p class="lead">Ovo je minimum pre prvog dana kursa. Svaka stavka je „Zapamti“ kartica iz nivoa. Kad završiš nivo, stavke se štikliraju.</p><div class="minl">' +
        MODS.map((m) => '<section style="--mc:' + m.color + '"><h3 class="minl-h">' + icon(m.icon) + "<span>Nivo " + m.n + " · " + esc(m.title) + "</span></h3><ul>" +
          m.steps.filter((s) => s.remember).map((s) => '<li class="' + (doneMod(m.id) ? "on" : "") + '">' + icon(doneMod(m.id) ? "check" : "target") + "<span>" + md(s.remember) + "</span></li>").join("") + "</ul></section>").join("") + "</div></section>";
    }
    const list = cardList(), known = list.filter((g) => S.known[g[1]]).length;
    if (cardIdx >= list.length) cardIdx = 0;
    return '<section class="kartice"><p class="eyebrow">Učionica</p><h1 class="h1">Rečnik bariste</h1>' + seg +
      '<div class="chips" role="group" aria-label="Filter po nivou"><button type="button" class="chip' + (cardFilter === "all" ? " on" : "") + '" data-cf="all">Svi</button>' +
      MODS.map((m) => '<button type="button" class="chip' + (cardFilter === m.id ? " on" : "") + '" data-cf="' + m.id + '">N' + m.n + "</button>").join("") + "</div>" +
      '<div class="flash-meta"><span>' + (cardIdx + 1) + " / " + list.length + '</span><span>Znaš: <b>' + known + "</b></span></div>" +
      '<div class="flash-host"></div><div class="flash-act"><button type="button" class="btn" data-fc="again">Ponovi</button><button type="button" class="btn btn-leaf" data-fc="know">' + icon("check") + "Znam</button></div>" +
      '<p class="hint">Tapni karticu da je okreneš. Strelice levo-desno listaju.</p></section>';
  }
  function mountFlash() {
    const host = app.querySelector(".flash-host"); if (!host) return;
    const list = cardList(), g = list[cardIdx]; if (!g) return;
    const m = modById(g[0]);
    host.innerHTML = '<button type="button" class="flash" aria-label="Okreni karticu: ' + esc(g[1]) + '"><span class="flash-in"><span class="flash-face"><span class="flash-tag" style="--mc:' + m.color + '">Nivo ' + m.n + '</span><b class="flash-term">' + esc(g[1]) + "</b>" + (S.known[g[1]] ? '<span class="flash-known">' + icon("check") + "znaš</span>" : "") +
      '</span><span class="flash-face flash-back"><span class="flash-def">' + esc(g[2]) + "</span></span></span></button>";
    host.querySelector(".flash").addEventListener("click", (e) => { e.currentTarget.classList.toggle("flip"); sfx.tap(); });
  }
  function flashMove(know) {
    const list = cardList(), g = list[cardIdx];
    if (g) { if (know) { S.known[g[1]] = 1; sfx.ok(); gain(1); } else { delete S.known[g[1]]; sfx.tap(); } persist(); }
    cardIdx = (cardIdx + 1) % Math.max(1, list.length);
    render();
  }

  /* ---------- PROFIL ---------- */
  function profilScreen() {
    const r = rankOf(S.xp), p = S.exam.passed;
    let h = '<section class="profil"><div class="phead"><button type="button" class="pav" data-act="edit" aria-label="Promeni ime i avatar">' + A.avatar(S.avatar) + '<span class="pav-edit">' + icon("edit") + "</span></button>" +
      '<div><p class="eyebrow">' + esc(r.t) + '</p><h1 class="h1">' + esc(S.name || "Barista") + "</h1></div></div>" +
      '<div class="pstats"><div><b>' + S.xp + "</b><span>zrna</span></div><div><b>" + S.streak.best + "</b><span>najduži niz</span></div><div><b>" + doneCount() + "/8</b><span>nivoa</span></div><div><b>" + (S.exam.best ? S.exam.best + "%" : "–") + "</b><span>test</span></div></div>";
    if (p) h += '<h2 class="h2 sec-h">Sertifikat</h2>' + certHTML();
    else h += '<div class="card cta-exam"><span class="cta-ic">' + icon("trophy") + '</span><div><b>Sertifikat čeka</b><p>' + (allDone() ? "Svi nivoi su gotovi. Položi završni test i dobij kod za trenera." : "Završi još " + (8 - doneCount()) + " " + U.plural(8 - doneCount(), "nivo", "nivoa", "nivoa") + ", pa položi završni test (80%).") + "</p></div>" +
      (allDone() || S.preview ? '<button type="button" class="btn btn-gold" data-act="exam-intro">Na test</button>' : "") + "</div>";
    h += '<h2 class="h2 sec-h">Bedževi <small>' + Object.keys(S.badges).length + "/" + Z.BADGES.length + '</small></h2><div class="badges">' +
      Z.BADGES.map((b) => '<div class="badge' + (S.badges[b.id] ? " on" : "") + '">' + A.medal(b.id, !!S.badges[b.id]) + "<b>" + esc(b.t) + "</b><span>" + esc(b.d) + "</span></div>").join("") + "</div>";
    h += '<h2 class="h2 sec-h">Podešavanja</h2><div class="settings card">' +
      '<button type="button" class="set-row" data-act="sound"><span>' + icon(S.sound ? "sound" : "mute") + "Zvuk</span><b>" + (S.sound ? "Uključen" : "Isključen") + "</b></button>" +
      '<button type="button" class="set-row" data-act="edit"><span>' + icon("edit") + "Ime i avatar</span><b>" + esc(S.name || "–") + "</b></button>" +
      '<button type="button" class="set-row danger" data-act="wipe"><span>' + icon("trash") + "Obriši napredak</span><b>Sa ovog uređaja</b></button></div>" +
      (Z.store.ok ? "" : '<p class="note bad">' + icon("info") + "Ovaj pregledač ne dozvoljava čuvanje. Napredak će nestati kad zatvoriš stranicu.</p>") +
      '<p class="note">' + icon("info") + "Napredak se čuva samo na ovom uređaju i u ovom pregledaču.</p>" +
      '<button type="button" class="linkish" data-tab="trener">Za trenere</button></section>';
    return h;
  }
  function certHTML() {
    const p = S.exam.passed;
    return '<div class="cert"><div class="cert-band"><span>Zrno po zrno</span><span>Barista minimum</span></div>' +
      '<div class="cert-body"><div class="cert-av">' + A.avatar(S.avatar) + '</div><p class="cert-l">Sertifikat izdat za</p><h3 class="cert-name">' + esc(S.name) + "</h3>" +
      '<p class="cert-l">Položen završni test pre kursa</p><div class="cert-row"><div><b>' + p.score + "%</b><span>rezultat</span></div><div><b>" + U.fmtDay(p.day) + "</b><span>datum</span></div><div><b>8/8</b><span>nivoa</span></div></div>" +
      '<div class="cert-code"><span>Kod za trenera</span><b>' + esc(p.code) + '</b></div></div><span class="cert-stamp" aria-hidden="true">Spreman<br>za kurs</span></div>' +
      '<div class="cert-act"><button type="button" class="btn" data-act="copy-code">' + icon("copy") + "Kopiraj kod</button></div>" +
      '<p class="hint">Napravi screenshot sertifikata i pošalji ga treneru pre prvog dana.</p>';
  }
  function editSheet() {
    let av = S.avatar;
    const w = sheet('<form class="edit-form" novalidate><h2 class="h2">Ime i avatar</h2><label for="ed-name">Ime (vidi ga trener na sertifikatu)</label>' +
      '<input id="ed-name" class="inp" maxlength="40" autocomplete="given-name" value="' + esc(S.name) + '"><p class="err" hidden>Upiši ime koje će trener prepoznati.</p>' +
      '<p class="lbl-s">Avatar</p><div class="avs-grid">' + Object.keys(A.avatars).map((k) => '<button type="button" class="avpick' + (k === av ? " on" : "") + '" data-av="' + k + '" aria-label="' + A.avatars[k].t + '">' + A.avatar(k) + "</button>").join("") + "</div>" +
      '<button type="submit" class="btn btn-gold btn-big">Sačuvaj</button></form>',
      (e) => { const b = e.target.closest("[data-av]"); if (b) { av = b.dataset.av; w.querySelectorAll(".avpick").forEach((x) => x.classList.toggle("on", x === b)); sfx.tap(); } });
    w.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const n = w.querySelector("#ed-name").value.trim();
      if (!n) { w.querySelector(".err").hidden = false; return; }
      S.name = n; S.avatar = av;
      if (S.exam.passed) S.exam.passed.code = U.makeCode(S.name, S.exam.passed.score, S.exam.passed.day);
      persist(); closeSheet(); sfx.ok(); render();
    });
  }
  function wipeSheet() {
    sheet('<div class="msheet"><h2 class="h2">Obrisati napredak?</h2><p class="msheet-d">Brišu se zrna, nivoi, bedževi i sertifikat sa ovog uređaja. Ovo ne može da se vrati.</p>' +
      '<div class="row2"><button type="button" class="btn" data-act="sheet-close">Odustani</button><button type="button" class="btn btn-cherry" data-act="wipe-yes">Obriši</button></div></div>',
      (e) => { if (e.target.closest("[data-act=wipe-yes]")) { Z.store.wipe(); S = defaults(); closeSheet(); tab = "put"; render(); openOnboarding(); } });
  }

  /* ---------- PANEL ZA TRENERE ---------- */
  function trenerScreen() {
    const qn = MODS.reduce((a, m) => a + m.steps.filter((s) => QTYPES.includes(s.t)).length + m.pool.length, 0);
    return '<section class="trener"><p class="eyebrow">Za trenere</p><h1 class="h1">Kako radi minimum</h1>' +
      '<ol class="steps-list"><li><b>Pošalji link polaznicima.</b> Otvaraju ga na telefonu, bez naloga i instalacije.</li>' +
      "<li><b>Minimum pre kursa:</b> svih 8 nivoa i završni test od " + Z.EXAM_SIZE + " pitanja sa najmanje " + Math.round(Z.PASS * 100) + "%.</li>" +
      "<li><b>Prvog dana</b> polaznik pokaže sertifikat sa kodom. Kod proveriš ovde.</li></ol>" +
      '<div class="card tr-box"><h2 class="h3">Proveri kod sertifikata</h2><label for="tr-name">Ime polaznika, kao na sertifikatu</label><input id="tr-name" class="inp" autocomplete="off">' +
      '<label for="tr-code">Kod</label><input id="tr-code" class="inp mono" placeholder="ZP-XXXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false">' +
      '<button type="button" class="btn btn-gold btn-big" data-act="tr-verify">Proveri kod</button><div class="tr-res" aria-live="polite"></div></div>' +
      '<div class="card tr-box"><h2 class="h3">Režim pregleda</h2><p>Otključava sve nivoe, igre i test na ovom uređaju, da sam proletiš kroz sadržaj.</p>' +
      '<button type="button" class="btn' + (S.preview ? " btn-cherry" : "") + '" data-act="tr-preview">' + (S.preview ? "Isključi pregled" : "Uključi pregled") + "</button></div>" +
      '<div class="card tr-box"><h2 class="h3">Sadržaj</h2><ul class="tr-list">' + MODS.map((m) => "<li><span>Nivo " + m.n + " · " + esc(m.title) + "</span><b>" + m.steps.length + " kartica</b></li>").join("") +
      "</ul><p>U banci je <b>" + qn + "</b> izazova, a test svaki put izvlači " + Z.EXAM_SIZE + " pitanja (po dva iz svakog nivoa + nasumična).</p></div>" +
      '<p class="note">' + icon("info") + "Napredak polaznika ostaje na njegovom telefonu. Kod sertifikata štiti od slučajnog prepravljanja, ali nije bezbednosni sistem: stvarnu proveru radiš uživo na kursu.</p>" +
      '<button type="button" class="linkish" data-tab="profil">Nazad na profil</button></section>';
  }
  function verify() {
    const n = app.querySelector("#tr-name").value.trim(), c = app.querySelector("#tr-code").value.trim(), out = app.querySelector(".tr-res");
    if (!n || !c) { out.className = "tr-res bad"; out.textContent = "Upiši i ime i kod."; return; }
    const r = U.checkCode(n, c);
    if (!r.format) { out.className = "tr-res bad"; out.textContent = "Kod nije u formatu ZP-XXXXX-XXXX."; sfx.bad(); return; }
    if (r.ok) { out.className = "tr-res ok"; out.innerHTML = icon("check") + "<span>Kod je ispravan: <b>" + r.score + "%</b>, položeno " + r.date + (r.score >= Z.PASS * 100 ? "" : " (ispod praga)") + "</span>"; sfx.ok(); }
    else { out.className = "tr-res bad"; out.innerHTML = icon("close") + "<span>Kod se ne poklapa sa ovim imenom. Proveri kako je ime napisano na sertifikatu.</span>"; sfx.bad(); }
  }

  /* ---------- overlay ---------- */
  function openOv(html) {
    ov.innerHTML = html; ov.hidden = false; document.body.classList.add("ov-open");
    const f = ov.querySelector(".ls-foot .btn:not([hidden]), .btn"); if (f && f.focus) f.focus({ preventScroll: true });
  }
  function closeOv() {
    destroyAll(); L = null; ov.hidden = true; ov.innerHTML = ""; delete ov.dataset.game;
    document.body.classList.remove("ov-open"); render();
  }

  /* ---------- LEKCIJA i TEST ---------- */
  function buildExam() {
    const per = MODS.map((m) => U.shuffle(m.steps.filter((s) => s.t === "mc" || s.t === "tf" || s.t === "num").concat(m.pool)).map((s) => Object.assign({ _m: m.id }, s)));
    const out = [];
    per.forEach((l) => out.push(...l.splice(0, 2)));
    const rest = U.shuffle([].concat(...per));
    while (out.length < Z.EXAM_SIZE && rest.length) out.push(rest.shift());
    return U.shuffle(out);
  }
  function openLesson(mid, exam) {
    const m = exam ? null : modById(mid);
    L = { m, exam: !!exam, steps: exam ? buildExam() : m.steps, i: 0, pts: 0, max: 0, xp: 0, mistakes: 0, combo: 0, answered: false, handler: null, per: {} };
    ov.hidden = false; document.body.classList.add("ov-open"); sfx.tap();
    renderStep();
  }
  function renderStep() {
    destroyAll();
    const st = L.steps[L.i];
    L.answered = false; L.handler = null;
    const color = L.exam ? "var(--gold)" : L.m.color;
    const R = RENDER[st.t](st);
    const lab = st.t === "story" || st.t === "explore" || st.t === "clip" ? "Dalje" : "Proveri";
    const hidden = ["tf", "match", "sort", "hotspot", "game"].includes(st.t);
    const eyebrow = L.exam ? "Završni test · " + (L.i + 1) + "/" + L.steps.length : "Nivo " + L.m.n + " · " + esc(L.m.title);
    ov.innerHTML = '<div class="ls" style="--mc:' + color + '"><div class="ls-top"><button type="button" class="icon-btn" data-act="quit" aria-label="Prekini">' + icon("close") + "</button>" +
      '<div class="ls-prog" role="progressbar" aria-label="Napredak" aria-valuemin="0" aria-valuemax="' + L.steps.length + '" aria-valuenow="' + L.i + '"><i style="width:' + (L.i / L.steps.length * 100).toFixed(1) + '%"></i></div>' +
      '<span class="ls-xp">' + icon("bean") + "<b>" + L.xp + "</b></span></div>" +
      '<div class="ls-body"><div class="step step-' + st.t + '"><p class="crumb">' + eyebrow + "</p>" + R.html + "</div></div>" +
      '<div class="ls-foot"><div class="fb" hidden></div><button type="button" class="btn btn-gold btn-big ls-next"' + (QTYPES.includes(st.t) && !hidden ? " disabled" : "") + (hidden ? " hidden" : "") + ">" + lab + "</button></div></div>";
    const body = ov.querySelector(".ls-body");
    const api = {
      ready(on) { ov.querySelector(".ls-next").disabled = !on; },
      check(fn) { L.handler = fn; },
      answer(frac, extra) { answer(frac, extra); }
    };
    if (R.mount) R.mount(body.querySelector(".step"), api);
    body.scrollTop = 0;
    const nb = ov.querySelector(".ls-next"); if (!nb.hidden && !nb.disabled) nb.focus({ preventScroll: true });
  }
  const PRAISE = ["Tačno!", "Bravo!", "Tako je!", "Odlično!", "Pravi barista!"];
  function answer(frac, extra) {
    if (!L || L.answered) return;
    L.answered = true;
    const st = L.steps[L.i];
    frac = U.clamp(frac, 0, 1);
    L.pts += frac; L.max += 1;
    if (L.exam) { const p = L.per[st._m] || (L.per[st._m] = { p: 0, n: 0 }); p.p += frac; p.n++; }
    const full = frac >= 0.99;
    let bonus = 0;
    if (full) { L.combo++; if (L.combo >= 5) award("combo5"); bonus = L.combo >= 3 ? Math.min(10, (L.combo - 2) * 2) : 0; }
    else { L.combo = 0; L.mistakes++; }
    const xp = Math.round(10 * frac) + bonus;
    L.xp += xp; gain(xp);
    if (full) { L.combo >= 3 ? sfx.combo(L.combo) : sfx.ok(); } else sfx.bad();
    const head = full ? (L.combo >= 3 ? L.combo + " zaredom!" : PRAISE[Math.floor(Math.random() * PRAISE.length)]) : frac >= 0.5 ? "Skoro!" : "Ne baš.";
    const fb = ov.querySelector(".fb"), foot = ov.querySelector(".ls-foot"), nb = ov.querySelector(".ls-next");
    fb.innerHTML = '<p class="fb-h">' + icon(full ? "check" : frac >= 0.5 ? "target" : "close") + "<span>" + head + "</span>" + (xp ? "<em>+" + xp + "</em>" : "") + "</p>" +
      (extra && extra.correct ? '<p class="fb-a">' + extra.correct + "</p>" : "") + (st.why ? '<p class="fb-w">' + md(st.why) + "</p>" : "");
    fb.hidden = false;
    foot.className = "ls-foot " + (full ? "is-ok" : frac >= 0.5 ? "is-mid" : "is-bad");
    nb.textContent = "Dalje"; nb.disabled = false; nb.hidden = false;
    nb.className = "btn btn-big " + (full ? "btn-leaf" : frac >= 0.5 ? "btn-gold" : "btn-cherry") + " ls-next";
    const xb = ov.querySelector(".ls-xp b"); if (xb) xb.textContent = L.xp;
    nb.focus({ preventScroll: true });
  }
  function onNext() {
    const st = L.steps[L.i];
    if (QTYPES.includes(st.t) && !L.answered) {
      if (L.handler) { const r = L.handler(); if (r) answer(r.frac, r); }
      return;
    }
    if (L.i < L.steps.length - 1) { L.i++; sfx.tap(); renderStep(); } else finishLesson();
  }
  function quitSheet() {
    sheet('<div class="msheet"><h2 class="h2">' + (L.exam ? "Prekinuti test?" : "Prekinuti nivo?") + '</h2><p class="msheet-d">' + (L.exam ? "Test se neće računati." : "Zrna koja si skupio ostaju, ali nivo neće biti završen.") + "</p>" +
      '<div class="row2"><button type="button" class="btn btn-gold" data-act="sheet-close">Nastavi</button><button type="button" class="btn" data-act="quit-yes">Prekini</button></div></div>',
      (e) => { if (e.target.closest("[data-act=quit-yes]")) { closeSheet(); closeOv(); } });
  }
  function finishLesson() {
    destroyAll();
    const acc = L.max ? L.pts / L.max : 1;
    if (L.exam) return finishExam(acc);
    const m = L.m, prev = S.mods[m.id] || {}, first = !prev.done;
    const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    let bonus = 20 + (L.mistakes === 0 ? 20 : 0);
    if (!first) bonus = Math.round(bonus / 2);
    S.mods[m.id] = { done: true, stars: Math.max(prev.stars || 0, stars), best: Math.max(prev.best || 0, Math.round(acc * 100)) };
    L.xp += bonus; gain(bonus);
    if (m.n === 1) award("first");
    if (L.mistakes === 0) award("perfect");
    if (doneCount() >= 4) award("half");
    if (MODS.every((x) => S.mods[x.id] && S.mods[x.id].stars === 3)) award("allstars");
    persist();
    const ni = MODS.indexOf(m) + 1, nm = MODS[ni];
    ov.innerHTML = '<div class="ls res" style="--mc:' + m.color + '"><div class="ls-body res-body"><div class="res-top">' +
      '<span class="res-ic">' + icon(m.icon) + '</span><p class="eyebrow">Nivo ' + m.n + ' završen</p><h2 class="h1">' + esc(m.title) + "</h2>" + G.starRow(stars) + "</div>" +
      '<div class="res-stats"><div><b>' + Math.round(acc * 100) + "%</b><span>tačnost</span></div><div><b>+" + L.xp + "</b><span>zrna</span></div><div><b>" + S.streak.n + "</b><span>" + U.plural(S.streak.n, "dan", "dana", "dana") + " zaredom</span></div></div>" +
      (nm ? '<div class="res-next"><span>Sledeće</span><b>Nivo ' + nm.n + " · " + esc(nm.title) + "</b></div>" : '<div class="res-next"><span>Sledeće</span><b>Završni test</b></div>') +
      '</div><div class="ls-foot"><button type="button" class="btn btn-gold btn-big" data-act="res-next">' + (nm ? "Sledeći nivo" : "Na završni test") + '</button><button type="button" class="btn btn-ghost" data-act="close-ov">Nazad na put</button></div></div>';
    ov.dataset.next = nm ? nm.id : "exam";
    sfx.win(); Z.confetti.burst(stars === 3 ? 110 : 50);
  }
  function finishExam(acc) {
    const score = Math.round(acc * 100), pass = acc >= Z.PASS;
    S.exam.tries++; S.exam.best = Math.max(S.exam.best, score);
    if (pass) {
      const day = U.dayNum();
      if (!S.exam.passed || score >= S.exam.passed.score) S.exam.passed = { score, day, code: U.makeCode(S.name, score, day) };
      award("ready"); gain(100);
    }
    persist();
    const weak = MODS.filter((m) => L.per[m.id] && L.per[m.id].p / L.per[m.id].n < 0.75);
    let body;
    if (pass) {
      body = '<div class="res-top"><span class="res-ic">' + icon("trophy") + '</span><p class="eyebrow">Završni test</p><h2 class="h1">Položeno! ' + score + "%</h2><p class=\"lead\">Spreman si za prvi dan kursa. Pokaži ovaj sertifikat treneru.</p></div>" + certHTML();
      sfx.win(); Z.confetti.burst(140);
    } else {
      body = '<div class="res-top"><span class="res-ic bad">' + icon("target") + '</span><p class="eyebrow">Završni test</p><h2 class="h1">' + score + "%</h2><p class=\"lead\">Za prolaz treba " + Math.round(Z.PASS * 100) + "%. Fali ti još " + (Math.round(Z.PASS * 100) - score) + "%. Ponovi slabije nivoe i probaj opet, pitanja se menjaju.</p></div>" +
        (weak.length ? '<div class="weak"><p class="eyebrow">Ponovi ove nivoe</p>' + weak.map((m) => '<button type="button" class="weak-row" data-start="' + m.id + '" style="--mc:' + m.color + '">' + icon(m.icon) + "<span>Nivo " + m.n + " · " + esc(m.title) + "</span>" + icon("next") + "</button>").join("") + "</div>" : "");
      sfx.bad();
    }
    ov.innerHTML = '<div class="ls res" style="--mc:var(--gold)"><div class="ls-body res-body">' + body + '</div><div class="ls-foot">' +
      (pass ? '<button type="button" class="btn btn-gold btn-big" data-act="close-ov">Gotovo</button>' : '<button type="button" class="btn btn-gold btn-big" data-act="exam-again">Pokušaj ponovo</button><button type="button" class="btn btn-ghost" data-act="close-ov">Nazad na put</button>') + "</div></div>";
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

  const RENDER = {
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
        mount(root) { const c = G.clip(root.querySelector(".clip-host"), st.clip); cleanups.push(() => c.destroy()); }
      };
    },
    game(st) {
      return {
        html: '<p class="eyebrow q-k">Igra</p><h2 class="st-title">' + esc(st.title) + '</h2><p class="st-text">' + esc(st.text) + '</p><div class="game-host"></div>',
        mount(root, api) {
          const fn = { dialin: "dialin", milk: "milk", latte: "latte", recipe: "recipe" }[st.game];
          const inst = G[fn](root.querySelector(".game-host"), {
            mode: "lesson",
            onWin: () => award("dial"),
            onDone: (r) => { recordGame(st.game, r, false); if (!L.answered) api.answer(r.score, { correct: "" }); }
          });
          cleanups.push(() => inst.destroy());
        }
      };
    },
    mc(st) {
      const order = U.shuffle(st.opts.map((_, i) => i));
      return {
        html: (st.art ? '<div class="art plate art-q">' + A.misc(st.art) + "</div>" : "") + qHead(L && L.exam ? "Pitanje" : "Pitanje", st.q) +
          '<div class="opts" role="radiogroup">' + order.map((oi, k) => '<button type="button" class="opt" role="radio" aria-checked="false" data-i="' + oi + '"><span class="opt-k">' + "ABCD"[k] + "</span><span>" + esc(st.opts[oi]) + "</span></button>").join("") + "</div>",
        mount(root, api) {
          let sel = -1;
          root.querySelector(".opts").addEventListener("click", (e) => {
            const b = e.target.closest(".opt"); if (!b || L.answered) return;
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
            const b = e.target.closest(".tfb"); if (!b || L.answered) return;
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
            const b = e.target.closest(".chip-btn"); if (!b || L.answered) return;
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
            const b = e.target.closest(".m-btn"); if (!b || b.classList.contains("done") || L.answered) return;
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
          cleanups.push(() => d.destroy());
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
            const p = e.target.closest(".part"); if (!p || L.answered) return;
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

  /* ---------- PRVO POKRETANJE ---------- */
  function openOnboarding() {
    let step = 0, av = S.avatar || "zrno";
    function draw() {
      if (step === 0) {
        ov.innerHTML = '<div class="onb"><div class="onb-hero"><img src="img/hero.jpg" alt="Espresso curi iz portafiltera u dve šoljice"><div class="onb-title"><span class="onb-sticker">barista minimum</span><h1>Zrno<br>po<br>zrno</h1></div></div>' +
          '<div class="onb-body"><p class="onb-lead">Pre prvog dana kursa prođi 8 kratkih nivoa, od trešnje do latte arta. Igraj, skupljaj zrna i dođi spreman.</p>' +
          '<button type="button" class="btn btn-gold btn-big" data-onb="next">Kreni</button></div></div>';
      } else if (step === 1) {
        ov.innerHTML = '<div class="onb onb-form"><form class="onb-body" novalidate><p class="eyebrow">Korak 1 od 2</p><h2 class="h1">Ko si ti?</h2>' +
          '<label for="onb-name">Ime (trener ga vidi na sertifikatu)</label><input id="onb-name" class="inp" maxlength="40" autocomplete="given-name" placeholder="npr. Jovana Petrović" value="' + esc(S.name) + '">' +
          '<p class="err" hidden>Upiši ime koje će trener prepoznati.</p><p class="lbl-s">Izaberi avatar</p><div class="avs-grid">' +
          Object.keys(A.avatars).map((k) => '<button type="button" class="avpick' + (k === av ? " on" : "") + '" data-av="' + k + '" aria-label="' + A.avatars[k].t + '">' + A.avatar(k) + "<span>" + A.avatars[k].t + "</span></button>").join("") +
          '</div><button type="submit" class="btn btn-gold btn-big">Dalje</button></form></div>';
        ov.querySelector("form").addEventListener("submit", (e) => {
          e.preventDefault();
          const n = ov.querySelector("#onb-name").value.trim();
          if (!n) { ov.querySelector(".err").hidden = false; ov.querySelector("#onb-name").focus(); sfx.bad(); return; }
          S.name = n; S.avatar = av; persist(); step = 2; sfx.ok(); draw();
        });
        setTimeout(() => { const i = ov.querySelector("#onb-name"); if (i && !i.value) i.focus(); }, 60);
      } else {
        ov.innerHTML = '<div class="onb onb-form"><div class="onb-body"><p class="eyebrow">Korak 2 od 2</p><h2 class="h1">Kako ide</h2><ul class="how">' +
          "<li>" + icon("path") + "<div><b>8 nivoa, 6–10 min svaki</b><span>Kratke kartice, klipovi i pitanja. Sve iz skripte za kurs.</span></div></li>" +
          "<li>" + icon("bean") + "<div><b>Zrna, niz dana i bedževi</b><span>Svaki tačan odgovor donosi zrna. Uči svaki dan i čuvaj niz.</span></div></li>" +
          "<li>" + icon("arcade") + "<div><b>Igre</b><span>Uštimaj mlin, stimuj mleko, sipaj srce i složi recepte.</span></div></li>" +
          "<li>" + icon("trophy") + "<div><b>Završni test: 80%</b><span>Dobijaš sertifikat sa kodom koji pokazuješ treneru prvog dana.</span></div></li></ul>" +
          '<button type="button" class="btn btn-gold btn-big" data-onb="done">Prvi nivo</button></div></div>';
      }
      const b = ov.querySelector(".btn"); if (b && step !== 1) b.focus({ preventScroll: true });
    }
    ov.hidden = false; document.body.classList.add("ov-open");
    ov.dataset.mode = "onb";
    ov.onboard = {
      click(e) {
        const a = e.target.closest("[data-av]");
        if (a) { av = a.dataset.av; ov.querySelectorAll(".avpick").forEach((x) => x.classList.toggle("on", x === a)); sfx.tap(); return true; }
        const b = e.target.closest("[data-onb]"); if (!b) return false;
        sfx.tap();
        if (b.dataset.onb === "next") { step = 1; draw(); }
        else if (b.dataset.onb === "done") { S.onboarded = true; persist(); delete ov.dataset.mode; ov.onboard = null; closeOv(); openLesson("m1"); }
        return true;
      }
    };
    draw();
  }

  /* ---------- događaji ---------- */
  app.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab],[data-act],[data-mod],[data-start],[data-game],[data-cmode],[data-cf],[data-fc]");
    if (!t) return;
    if (t.dataset.tab) return go(t.dataset.tab);
    if (t.dataset.mod) return moduleSheet(t.dataset.mod);
    if (t.dataset.start) return openLesson(t.dataset.start);
    if (t.dataset.game) return openGame(t.dataset.game);
    if (t.dataset.cmode) { cardsMode = t.dataset.cmode; sfx.tap(); return render(); }
    if (t.dataset.cf) { cardFilter = t.dataset.cf; cardIdx = 0; sfx.tap(); return render(); }
    if (t.dataset.fc) return flashMove(t.dataset.fc === "know");
    const a = t.dataset.act;
    if (a === "sound") { S.sound = !S.sound; sfx.on = S.sound; persist(); if (S.sound) sfx.ok(); render(); }
    else if (a === "exam-intro") examIntro();
    else if (a === "edit") editSheet();
    else if (a === "wipe") wipeSheet();
    else if (a === "tr-verify") verify();
    else if (a === "tr-preview") { S.preview = !S.preview; persist(); toast(S.preview ? "Pregled uključen: sve je otključano." : "Pregled isključen."); render(); }
    else if (a === "copy-code") {
      const code = S.exam.passed && S.exam.passed.code;
      const done = () => toast("Kod je kopiran.");
      const fail = () => { const b = app.querySelector(".cert-code b"); if (b) { const r = document.createRange(); r.selectNodeContents(b); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } toast("Kod je označen. Kopiraj ga ručno."); };
      try { navigator.clipboard.writeText(code).then(done, fail); } catch (err) { fail(); }
    }
  });
  app.addEventListener("keydown", (e) => { if (e.target.id === "tr-code" && e.key === "Enter") verify(); });

  ov.addEventListener("click", (e) => {
    if (ov.onboard && ov.onboard.click(e)) return;
    const t = e.target.closest("[data-act],[data-start]");
    if (e.target.closest(".ls-next")) return onNext();
    if (!t) return;
    if (t.dataset.start) { closeOv(); openLesson(t.dataset.start); return; }
    const a = t.dataset.act;
    if (a === "quit") quitSheet();
    else if (a === "close-ov") { sfx.tap(); closeOv(); }
    else if (a === "replay") { const id = ov.dataset.game; destroyAll(); openGame(id); }
    else if (a === "res-next") { const n = ov.dataset.next; delete ov.dataset.next; if (n === "exam") { closeOv(); examIntro(); } else { closeOv(); openLesson(n); } }
    else if (a === "exam-again") { closeOv(); openLesson(null, true); }
    else if (a === "copy-code") {
      const code = S.exam.passed && S.exam.passed.code;
      try { navigator.clipboard.writeText(code).then(() => toast("Kod je kopiran."), () => toast("Kopiraj kod ručno: " + code)); } catch (err) { toast("Kopiraj kod ručno: " + code); }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (document.querySelector(".sheet-wrap")) { closeSheet(); return; }
      if (!ov.hidden && L) quitSheet();
      else if (!ov.hidden && ov.dataset.game) closeOv();
    }
    if (tab === "kartice" && ov.hidden && !document.querySelector(".sheet-wrap") && cardsMode === "kartice") {
      if (e.key === "ArrowRight") flashMove(false);
      else if (e.key === "ArrowLeft") { const n = cardList().length; cardIdx = (cardIdx - 1 + n) % n; render(); }
    }
  });
  document.addEventListener("pointerdown", () => sfx.unlock(), { once: true });
  let rz = 0;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (tab === "put") drawTrail(); }, 120); });
  window.addEventListener("hashchange", () => { if (location.hash === "#trener") { tab = "trener"; render(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (tab === "put") drawTrail(); });

  /* ---------- start ---------- */
  function start(data) {
    S = loadState();
    sfx.on = S.sound;
    if (data && data.tab) tab = data.tab;
    if (location.hash === "#trener") tab = "trener";
    render();
    if (!S.onboarded) openOnboarding();
  }
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ tab }));
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
