/* Zrno po zrno – ilustracije: ikonice, avatari, interaktivni dijagrami, latte art. */
(function () {
  const Z = window.ZPZ;
  const INK = "#241510";
  let uid = 0;

  /* ---------- UI ikonice (24×24, linija) ---------- */
  const IC = {
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    star: '<path fill="currentColor" stroke="none" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/>',
    flame: '<path fill="currentColor" stroke="none" d="M12.3 2.5c.4 3 2.9 4.6 4.3 6.9 1.9 3.1 1.2 7.2-1.7 9.3-2.6 1.9-6.4 1.7-8.7-.5-2.2-2.1-2.6-5.5-1-8.1.3 1.3 1.1 2.3 2.2 2.7-.4-3.8 1.6-7.4 4.9-10.3z"/>',
    bean: '<g transform="rotate(-35 12 12)"><ellipse cx="12" cy="12" rx="6.6" ry="9.4" fill="currentColor" stroke="none"/><path d="M12 3.4c-2.4 2.9-2.4 5.7 0 8.6s2.4 5.7 0 8.6" style="stroke:var(--bean-line)" stroke-width="1.7"/></g>',
    sound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    path: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.5"/>',
    arcade: '<path d="M7 8h10a4 4 0 0 1 4 4.5l-.6 3.4a2.6 2.6 0 0 1-4.6 1.1L14.6 15H9.4l-1.2 2a2.6 2.6 0 0 1-4.6-1.1L3 12.5A4 4 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="16" cy="11.5" r=".9" fill="currentColor"/><circle cx="17.7" cy="13.5" r=".9" fill="currentColor"/>',
    cards: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/>',
    user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-4 4-5.5 7.5-5.5s6.3 1.5 7.5 5.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v4.5H9"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20.5h7M10 17h4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    spark: '<path fill="currentColor" stroke="none" d="M13 2 5 13.5h6L10 22l9-12.5h-6z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    heart: '<path fill="currentColor" stroke="none" d="M12 20.5 4.4 13.2A4.8 4.8 0 0 1 12 6.9a4.8 4.8 0 0 1 7.6 6.3z"/>',
    swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
    half: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5z" fill="currentColor"/>',
    gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.4" fill="currentColor"/>',
    edit: '<path d="M4.5 19.5l1-4L16 5a2.1 2.1 0 0 1 3 3L8.5 18.5z"/>',
    trash: '<path d="M5 7h14M10 4h4M7 7l1 13h8l1-13"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    /* ikonice nivoa */
    leaf: '<path d="M4.5 19.5C4.5 10 10.5 4.5 20 4.5c0 9.5-5.5 15.5-15 15z"/><path d="M4.5 19.5c3.5-4.5 7-7.5 11-10"/>',
    cherry: '<circle cx="7.5" cy="16" r="4"/><circle cx="16.5" cy="16.5" r="3.5"/><path d="M7.5 12c.8-3.5 3.2-6.5 7-8.5M16.5 13c-.8-3.5-1.5-6.5-2-9.5"/><path d="M14.5 3.5c2.6-.6 4.7.3 6 2.5-2.6.6-4.7-.3-6-2.5z"/>',
    machine: '<rect x="3.5" y="3.5" width="17" height="6" rx="1.5"/><path d="M9 9.5v2h6v-2M6 11.5h12M9.5 15.5h5l-.6 3.5h-3.8zM3.5 20.5h17"/>',
    grinder: '<path d="M7 3.5h10l-2.5 6h-5z"/><path d="M9 9.5h6l1 11H8z"/><path d="M5 20.5h14M8 13.5H5.5v3"/>',
    scale: '<path d="M3.5 18.5h17v2h-17zM6 18.5V16h12v2.5"/><path d="M8.5 16V9.5h7V16M15.5 11h1.5a1.5 1.5 0 0 1 0 3h-1.5"/>',
    drop: '<path d="M12 3.5c3.2 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-6.8 6-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
    dripper: '<path d="M4.5 5.5h15l-4.5 8h-6zM12 13.5v2"/><path d="M7 15.5h10V18a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 18z"/>',
    pitcher: '<path d="M6 5.5h11l-1.3 13.6a1.5 1.5 0 0 1-1.5 1.4H8.8a1.5 1.5 0 0 1-1.5-1.4zM6 5.5 3.5 4"/><path d="M16.6 8.5h1.6a2.3 2.3 0 0 1 0 4.6h-2"/>',
    cup: '<path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5c0 1.2 1 1.2 1 2.5M12 3.5c0 1.2 1 1.2 1 2.5"/>'
  };
  function icon(name, cls) {
    return '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (IC[name] || "") + "</svg>";
  }

  /* ---------- avatari ---------- */
  const eyes = (x1, x2, y, light) => {
    const w = light ? "#fff" : INK, p = light ? INK : "#fff";
    return '<circle cx="' + x1 + '" cy="' + y + '" r="3.1" fill="' + w + '"/><circle cx="' + x2 + '" cy="' + y + '" r="3.1" fill="' + w + '"/>' +
      '<circle cx="' + (x1 + 0.9) + '" cy="' + (y - 0.9) + '" r="1" fill="' + p + '"/><circle cx="' + (x2 + 0.9) + '" cy="' + (y - 0.9) + '" r="1" fill="' + p + '"/>';
  };
  const smile = (x1, x2, y, c) => '<path d="M' + x1 + " " + y + " Q" + (x1 + x2) / 2 + " " + (y + 5) + " " + x2 + " " + y + '" fill="none" stroke="' + (c || INK) + '" stroke-width="2.2" stroke-linecap="round"/>';
  const AV = {
    zrno: { t: "Zrno", bg: "#F4AE3D", g: '<g transform="rotate(-24 32 34)"><ellipse cx="32" cy="34" rx="16" ry="21" fill="#6E3B21" stroke="' + INK + '" stroke-width="2.5"/><path d="M32 14c-5 6-5 13 0 20" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/></g>' + eyes(26, 39, 37, true) + smile(28, 37, 44, "#fff") },
    tresnja: { t: "Trešnja", bg: "#A9BF76", g: '<path d="M32 23c0-6 3-10 8-13" stroke="#3B5E2B" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M38 12c5-3 10-2 13 1-5 3-10 2-13-1z" fill="#2E8B57" stroke="' + INK + '" stroke-width="1.5"/><circle cx="32" cy="39" r="15" fill="#D7263D" stroke="' + INK + '" stroke-width="2.5"/><ellipse cx="25" cy="32" rx="3.4" ry="2" fill="#fff" opacity=".55" transform="rotate(-35 25 32)"/>' + eyes(27, 37, 39) + smile(28, 36, 45) },
    soljica: { t: "Šoljica", bg: "#7DA7EA", g: '<path d="M26 18c0-3 3-3 3-6M34 18c0-3 3-3 3-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M15 25h31v10a13 13 0 0 1-13 13h-5a13 13 0 0 1-13-13z" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/><path d="M46 28h3.5a5.5 5.5 0 0 1 0 11H45" fill="none" stroke="' + INK + '" stroke-width="2.5"/><ellipse cx="30.5" cy="25" rx="15.5" ry="3.6" fill="#6E3B21" stroke="' + INK + '" stroke-width="2.5"/>' + eyes(25, 36, 35) + smile(27, 34, 41) },
    latijera: { t: "Latijera", bg: "#3FB3AE", g: '<path d="M18 21h26l-2.6 26a3 3 0 0 1-3 2.7H23.6a3 3 0 0 1-3-2.7z" fill="#DCE1E6" stroke="' + INK + '" stroke-width="2.5"/><path d="M18 21l-6-3.6" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/><path d="M43 26h3a5 5 0 0 1 0 10h-4" fill="none" stroke="' + INK + '" stroke-width="2.5"/><ellipse cx="31" cy="21" rx="13" ry="3" fill="#fff" stroke="' + INK + '" stroke-width="2"/>' + eyes(26, 36, 33) + smile(28, 34, 39) },
    portafilter: { t: "Portafilter", bg: "#EF6A7B", g: '<rect x="5" y="30" width="27" height="7.5" rx="3.7" fill="#3A2416" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-8 18 34)"/><circle cx="41" cy="33" r="15" fill="#CDD3D9" stroke="' + INK + '" stroke-width="2.5"/><circle cx="41" cy="33" r="10" fill="#6E3B21"/>' + eyes(37, 45, 31, true) + smile(38, 44, 37, "#fff") },
    ketl: { t: "Ketl", bg: "#C9A06A", g: '<path d="M24 29c0-5 16-5 16 0" fill="#2B2826" stroke="' + INK + '" stroke-width="2.5"/><circle cx="32" cy="22.5" r="2.3" fill="#2B2826"/><path d="M19 29h26l3 19H16z" fill="#2B2826" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/><path d="M17 44c-6-1-7-10-4-16 1.5-3 0-6-3-7" fill="none" stroke="#2B2826" stroke-width="3.6" stroke-linecap="round"/><path d="M45 33c5 0 6 9 1 12" fill="none" stroke="#2B2826" stroke-width="3.2" stroke-linecap="round"/>' + eyes(27, 37, 38, true) + smile(29, 35, 44, "#fff") }
  };
  function avatar(id) {
    const a = AV[id] || AV.zrno;
    return '<svg class="avs" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="' + a.bg + '"/>' + a.g + "</svg>";
  }

  /* ---------- zrno za stazu ---------- */
  const BEAN = '<svg viewBox="0 0 120 84" aria-hidden="true"><path class="bean-body" d="M10 46C8 20 40 6 66 8c30 2 48 20 44 38-4 22-30 34-56 32C28 76 12 64 10 46z"/><path class="bean-crease" d="M24 50c20-22 46 8 74-14"/></svg>';

  /* ---------- medalje (bedževi) ---------- */
  const BADGE_IC = { first: "cup", perfect: "check", combo5: "spark", streak3: "flame", half: "half", dial: "gauge", swipe: "swap", milk: "pitcher", latte: "heart", recipe: "dripper", allstars: "star", ready: "trophy" };
  function medal(id, on) {
    return '<span class="medal' + (on ? " on" : "") + '">' + icon(BADGE_IC[id] || "star") + "</span>";
  }

  /* ---------- interaktivni dijagrami ---------- */
  function lbl(id, x, y, n) {
    return '<g class="lbl" data-for="' + id + '"><circle cx="' + x + '" cy="' + y + '" r="11" fill="#F4AE3D" stroke="' + INK + '" stroke-width="2"/><text x="' + x + '" y="' + (y + 4.5) + '" text-anchor="middle" font-size="13" font-weight="800" fill="' + INK + '" font-family="Onest, system-ui, sans-serif">' + n + "</text></g>";
  }
  const DIAG = {
    cherry: {
      parts: [
        { id: "opna", label: "1 · Spoljašnja opna", desc: "Crvena kožica zrele trešnje." },
        { id: "pulpa", label: "2 · Pulpa", desc: "Slatko meso ploda." },
        { id: "sluz", label: "3 · Sluz (musilaž)", desc: "Lepljivi sloj. Kod prane obrade fermentiše u vodi." },
        { id: "parcment", label: "4 · Parčment", desc: "Tanka zaštitna ljuska oko zrna." },
        { id: "srebrna", label: "5 · Srebrna opna", desc: "Najtanja opna, prijanja uz samo zrno." },
        { id: "zrno", label: "6 · Zeleno zrno", desc: "Sirovo zrno koje se kasnije prži. U trešnji su obično dva." }
      ],
      svg: function () {
        const s = 'stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"';
        return '<svg viewBox="0 0 320 290" role="img" aria-label="Presek trešnje kafe">' +
          '<g class="part" data-part="opna"><path d="M46 70Q160-14 274 70Q160 52 46 70Z" fill="#D7263D" ' + s + '/></g>' +
          '<g class="part" data-part="pulpa"><path d="M58 108Q160 32 262 108Q160 92 58 108Z" fill="#F0663A" ' + s + '/></g>' +
          '<g class="part" data-part="sluz"><path d="M70 144Q160 76 250 144Q160 129 70 144Z" fill="#F7C94B" ' + s + '/></g>' +
          '<g class="part" data-part="parcment"><path d="M80 178Q160 118 240 178Q160 165 80 178Z" fill="#EBD8B0" ' + s + '/></g>' +
          '<g class="part" data-part="srebrna"><path d="M90 210Q160 156 230 210Q160 198 90 210Z" fill="#D7DCE1" ' + s + '/></g>' +
          '<path d="M58 238Q160 318 262 238Z" fill="#B3182E" ' + s + ' pointer-events="none"/>' +
          '<g class="part" data-part="zrno"><ellipse cx="123" cy="236" rx="38" ry="18" fill="#A9C46C" ' + s + '/><path d="M89 238q34-10 68 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
          '<ellipse cx="197" cy="236" rx="38" ry="18" fill="#A9C46C" ' + s + '/><path d="M163 238q34-10 68 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/></g>' +
          lbl("opna", 290, 64, 1) + lbl("pulpa", 280, 102, 2) + lbl("sluz", 268, 138, 3) + lbl("parcment", 258, 172, 4) + lbl("srebrna", 248, 204, 5) + lbl("zrno", 258, 246, 6) +
          "</svg>";
      }
    },
    espresso: {
      parts: [
        { id: "krema", label: "Krema", desc: "Zlatno-braon sloj od mikromehurića CO₂ i ulja. Čuva najveći deo arome." },
        { id: "telo", label: "Telo", desc: "Srednji sloj. Ulja i sitne čestice daju punoću i viskoznost." },
        { id: "srce", label: "Srce", desc: "Donji, najkoncentrovaniji sloj: kiseline, šećeri, melanoidini i kofein." }
      ],
      svg: function () {
        const id = "esp" + (++uid);
        const glass = "M66 24H194L180 204Q178 222 160 222H100Q82 222 80 204Z";
        let bub = "";
        [[96, 52, 3], [112, 60, 2.2], [130, 50, 3.4], [150, 58, 2.4], [168, 50, 2.8], [120, 70, 2], [158, 72, 2.2], [104, 72, 1.8], [178, 64, 2]].forEach((b) => {
          bub += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="#E7B98A" opacity=".85"/>';
        });
        return '<svg viewBox="0 0 300 240" role="img" aria-label="Slojevi espresa"><defs><clipPath id="' + id + '"><path d="' + glass + '"/></clipPath></defs>' +
          '<path d="' + glass + '" fill="#F3F5F7"/>' +
          '<g clip-path="url(#' + id + ')">' +
          '<g class="part" data-part="krema"><rect x="60" y="42" width="140" height="40" fill="#C98A4B"/>' + bub + "</g>" +
          '<g class="part" data-part="telo"><rect x="60" y="82" width="140" height="70" fill="#6B3A1E"/></g>' +
          '<g class="part" data-part="srce"><rect x="60" y="152" width="140" height="72" fill="#2E140A"/></g>' +
          "</g>" +
          '<path d="' + glass + '" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
          '<g class="lbl" data-for="krema"><path d="M196 62H232" stroke="' + INK + '" stroke-width="2"/><text x="238" y="67" font-size="15" font-weight="800" fill="' + INK + '" font-family="Onest, system-ui, sans-serif">Krema</text></g>' +
          '<g class="lbl" data-for="telo"><path d="M190 117H232" stroke="' + INK + '" stroke-width="2"/><text x="238" y="122" font-size="15" font-weight="800" fill="' + INK + '" font-family="Onest, system-ui, sans-serif">Telo</text></g>' +
          '<g class="lbl" data-for="srce"><path d="M184 186H232" stroke="' + INK + '" stroke-width="2"/><text x="238" y="191" font-size="15" font-weight="800" fill="' + INK + '" font-family="Onest, system-ui, sans-serif">Srce</text></g>' +
          "</svg>";
      }
    },
    grinder: {
      parts: [
        { id: "poklopac", label: "Poklopac", desc: "Zatvara silos i čuva zrna od vazduha i prašine." },
        { id: "silos", label: "Silos", desc: "Ovde sipaš zrna kafe." },
        { id: "nozevi", label: "Noževi (ravni ili konusni)", desc: "Melju zrna. Bliže = sitnije, dalje = krupnije." },
        { id: "kuciste", label: "Kućište", desc: "Telo mlina u kom su motor i elektronika." },
        { id: "motor", label: "Motor", desc: "Okreće noževe." },
        { id: "kontejner", label: "Kontejner", desc: "Ovde pada samlevena kafa pre nego što ode u portafilter." },
        { id: "drzac", label: "Držač", desc: "Na njega oslanjaš portafilter dok mlin dozira." },
        { id: "prekidac", label: "Prekidač", desc: "Pali i gasi mlin." }
      ],
      svg: function () {
        const s = 'stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"';
        let beans = "";
        [[118, 50], [138, 46], [156, 52], [126, 66], [146, 64], [134, 82], [120, 86], [150, 82], [136, 98]].forEach((b, i) => {
          beans += '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="7" ry="5" transform="rotate(' + (i * 37 % 90 - 45) + " " + b[0] + " " + b[1] + ')" fill="#6E3B21"/>';
        });
        return '<svg viewBox="0 0 300 330" role="img" aria-label="Delovi mlina">' +
          '<rect x="66" y="296" width="140" height="16" rx="5" fill="#2B2826" ' + s + "/>" +
          '<g class="part" data-part="kuciste"><path d="M102 146H170L182 296H90Z" fill="#3A3532" ' + s + "/></g>" +
          '<g class="part" data-part="motor"><rect x="114" y="206" width="44" height="50" rx="8" fill="#5D554F" ' + s + '/><path d="M121 219h30M121 231h30M121 243h30" stroke="#8E847C" stroke-width="2.4"/></g>' +
          '<g class="part" data-part="kontejner"><path d="M50 156H104V214H58Z" fill="#C9CFD5" ' + s + '/><path d="M50 156h54" stroke="#fff" stroke-width="3" opacity=".7"/></g>' +
          '<g class="part" data-part="drzac"><path d="M44 236H100" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/><path d="M48 236v10M64 236v10" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/><rect x="40" y="226" width="66" height="26" fill="transparent"/></g>' +
          '<g class="part" data-part="prekidac"><circle cx="190" cy="262" r="10" fill="#D7263D" ' + s + "/></g>" +
          '<g class="part" data-part="nozevi"><rect x="106" y="118" width="60" height="30" rx="5" fill="#B9C1C8" ' + s + '/><circle cx="136" cy="133" r="10" fill="#8C959D" stroke="' + INK + '" stroke-width="3" stroke-dasharray="3 2"/></g>' +
          '<g class="part" data-part="silos"><path d="M86 30H186L160 118H112Z" fill="#E6EEF3" ' + s + "/>" + beans + "</g>" +
          '<g class="part" data-part="poklopac"><rect x="92" y="12" width="88" height="18" rx="6" fill="#2B2826" ' + s + "/></g>" +
          lbl("poklopac", 200, 21, 1) + lbl("silos", 196, 64, 2) + lbl("nozevi", 182, 124, 3) + lbl("kuciste", 70, 180, 4) +
          lbl("motor", 136, 274, 5) + lbl("kontejner", 36, 186, 6) + lbl("drzac", 30, 262, 7) + lbl("prekidac", 214, 262, 8) +
          "</svg>";
      }
    }
  };
  function diagram(name) { return DIAG[name]; }

  /* ---------- latte art ---------- */
  function cupWrap(inner, label) {
    const id = "cr" + (++uid);
    return '<svg viewBox="0 0 100 100" role="img" aria-label="' + (label || "Latte art") + '"><defs><radialGradient id="' + id + '" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#C47A3A"/><stop offset="1" stop-color="#7E4019"/></radialGradient></defs>' +
      '<circle cx="50" cy="50" r="48" fill="#F3EFEB" stroke="' + INK + '" stroke-width="2"/><circle cx="50" cy="50" r="40" fill="url(#' + id + ')"/>' + inner + "</svg>";
  }
  const W = "#FFF8EE";
  function rosetta(dx, dy, rot, sc) {
    let p = "";
    for (let i = 0; i < 8; i++) {
      const y = 72 - i * 5.6, w = 25 - i * 2.6;
      p += '<path d="M' + (50 - w) + " " + (y - 3) + " Q50 " + (y + 7) + " " + (50 + w) + " " + (y - 3) + '" fill="none" stroke="' + W + '" stroke-width="3.6" stroke-linecap="round"/>';
    }
    p += '<path d="M50 30c-5-6-12-1-7 4l7 6 7-6c5-5-2-10-7-4z" fill="' + W + '"/><path d="M50 22V80" stroke="#8A4A1E" stroke-width="1.3"/>';
    return '<g transform="translate(' + (50 + (dx || 0)) + " " + (50 + (dy || 0)) + ") rotate(" + (rot || 0) + ") scale(" + (sc || 1) + ') translate(-50 -50)">' + p + "</g>";
  }
  const LATTE = {
    heart: () => cupWrap('<path d="M50 74C30 62 22 50 24 41c2-10 14-14 26-4 12-10 24-6 26 4 2 9-6 21-26 33z" fill="' + W + '"/><path d="M50 30V76" stroke="#8A4A1E" stroke-width="1.2"/>', "Srce"),
    tulip: () => cupWrap('<path d="M28 60q22 22 44 0q-22 6-44 0z" fill="' + W + '"/><path d="M30 60q20-14 40 0q-20 9-40 0z" fill="' + W + '"/>' +
      '<path d="M33 47q17 18 34 0q-17 5-34 0z" fill="' + W + '"/><path d="M35 47q15-12 30 0q-15 8-30 0z" fill="' + W + '"/>' +
      '<path d="M50 41c-7-9-16-3-10 4l10 7 10-7c6-7-3-13-10-4z" fill="' + W + '"/><path d="M50 26V76" stroke="#8A4A1E" stroke-width="1.2"/>', "Tulip"),
    rosetta: () => cupWrap(rosetta(), "Rozeta"),
    swan: () => cupWrap(rosetta(8, 6, 28, 0.82) + '<path d="M36 76C24 66 30 50 36 44c5-5 4-12-1-14" fill="none" stroke="' + W + '" stroke-width="5" stroke-linecap="round"/><circle cx="36" cy="28" r="4.2" fill="' + W + '"/>', "Labud")
  };
  function latte(name) { return (LATTE[name] || LATTE.heart)(); }

  /* ---------- ilustracije za kartice priče ---------- */
  const T = (x, y, txt, size, weight, anchor, fill) =>
    '<text x="' + x + '" y="' + y + '" font-size="' + (size || 14) + '" font-weight="' + (weight || 700) + '" text-anchor="' + (anchor || "middle") + '" fill="' + (fill || INK) + '" font-family="Onest, system-ui, sans-serif">' + txt + "</text>";
  const D = (x, y, txt, size, fill, anchor) =>
    '<text x="' + x + '" y="' + y + '" font-size="' + (size || 28) + '" font-weight="900" text-anchor="' + (anchor || "middle") + '" fill="' + (fill || INK) + '" font-family="\'Big Shoulders Display\', \'Arial Narrow\', sans-serif" letter-spacing=".5">' + txt + "</text>";
  const M = (x, y, txt, size, fill, anchor) =>
    '<text x="' + x + '" y="' + y + '" font-size="' + (size || 14) + '" font-weight="600" text-anchor="' + (anchor || "middle") + '" fill="' + (fill || INK) + '" font-family="\'Martian Mono\', ui-monospace, monospace">' + txt + "</text>";
  function bean(cx, cy, rx, ry, rot, fill, straight) {
    return '<g transform="rotate(' + rot + " " + cx + " " + cy + ')"><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + (fill || "#6E3B21") + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      (straight ? '<path d="M' + cx + " " + (cy - ry + 5) + "V" + (cy + ry - 5) + '" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>'
        : '<path d="M' + cx + " " + (cy - ry + 5) + "C" + (cx - rx * 0.6) + " " + (cy - ry * 0.3) + " " + (cx + rx * 0.6) + " " + (cy + ry * 0.3) + " " + cx + " " + (cy + ry - 5) + '" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>') + "</g>";
  }
  const LCD = (x, y, w, h, big, small) =>
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="#1C1612"/>' +
    M(x + w / 2, y + h * 0.62, big, h * 0.42, "#9FE3B0") + (small ? M(x + w / 2, y + h - 8, small, 10, "#6FAF80") : "");
  const MISC = {
    beans2: () => '<svg viewBox="0 0 320 150" role="img" aria-label="Arabika i robusta">' +
      bean(95, 66, 34, 48, -18, "#7A4426") + bean(228, 70, 38, 40, 12, "#5E3420", true) +
      D(95, 140, "ARABIKA", 22) + D(228, 140, "ROBUSTA", 22) + "</svg>",
    pressure4: () => {
      const cx = 160, cy = 118, r = 86;
      let ticks = "";
      for (let i = 0; i <= 15; i++) {
        const a = Math.PI * (1 - i / 15), x1 = cx + Math.cos(a) * r, y1 = cy - Math.sin(a) * r;
        const x2 = cx + Math.cos(a) * (r - (i % 5 ? 8 : 14)), y2 = cy - Math.sin(a) * (r - (i % 5 ? 8 : 14));
        ticks += '<path d="M' + x1.toFixed(1) + " " + y1.toFixed(1) + "L" + x2.toFixed(1) + " " + y2.toFixed(1) + '" stroke="' + INK + '" stroke-width="' + (i % 5 ? 2 : 3) + '"/>';
        if (i % 5 === 0) ticks += M((cx + Math.cos(a) * (r - 28)).toFixed(1), (cy - Math.sin(a) * (r - 28) + 5).toFixed(1), i, 12);
      }
      const arc = (v1, v2, rr) => {
        const a1 = Math.PI * (1 - v1 / 15), a2 = Math.PI * (1 - v2 / 15);
        return "M" + (cx + Math.cos(a1) * rr).toFixed(1) + " " + (cy - Math.sin(a1) * rr).toFixed(1) + "A" + rr + " " + rr + " 0 0 1 " + (cx + Math.cos(a2) * rr).toFixed(1) + " " + (cy - Math.sin(a2) * rr).toFixed(1);
      };
      const na = Math.PI * (1 - 9 / 15);
      return '<svg viewBox="0 0 320 150" role="img" aria-label="Manometar: 9 bara">' +
        '<path d="' + arc(0, 15, r + 6) + '" fill="none" stroke="#E3D8CF" stroke-width="10"/>' +
        '<path d="' + arc(8, 9, r + 6) + '" fill="none" stroke="#1E9A5D" stroke-width="10"/>' +
        '<path d="' + arc(2.5, 3.5, r + 6) + '" fill="none" stroke="#2D6FD6" stroke-width="10"/>' + ticks +
        '<path d="M' + cx + " " + cy + "L" + (cx + Math.cos(na) * (r - 10)).toFixed(1) + " " + (cy - Math.sin(na) * (r - 10)).toFixed(1) + '" stroke="#D7263D" stroke-width="4" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + INK + '"/>' +
        M(cx, cy + 26, "BAR", 11) + T(40, 140, "predinfuzija ~3", 11, 700, "start", "#2D6FD6") + T(280, 140, "ekstrakcija 8–9", 11, 700, "end", "#1E9A5D") + "</svg>";
    },
    machine: () => '<svg viewBox="0 0 320 160" role="img" aria-label="Espresso aparat i dovod vode">' +
      '<rect x="70" y="20" width="170" height="70" rx="10" fill="#C9CFD5" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<rect x="70" y="20" width="170" height="16" rx="6" fill="#2B2826"/>' +
      '<rect x="100" y="90" width="36" height="16" fill="#9AA3AC" stroke="' + INK + '" stroke-width="2"/><rect x="174" y="90" width="36" height="16" fill="#9AA3AC" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="60" y="134" width="190" height="12" rx="4" fill="#2B2826"/><path d="M86 106h-30" stroke="#3A2416" stroke-width="8" stroke-linecap="round"/><path d="M226 50h28" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/><path d="M254 50v58" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M240 120C262 120 282 120 300 120" stroke="#2D6FD6" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 12"/><path d="M240 120h-6" stroke="#2D6FD6" stroke-width="7" stroke-linecap="round"/>' +
      '<circle cx="290" cy="120" r="13" fill="#DCF3E6" stroke="#1E9A5D" stroke-width="2.5"/><path d="M284 120l4 4 8-8" fill="none" stroke="#1E9A5D" stroke-width="3" stroke-linecap="round"/>' +
      T(290, 152, "voda", 11, 700, "middle", "#2D6FD6") + "</svg>",
    ebr: () => '<svg viewBox="0 0 320 140" role="img" aria-label="20 g kafe daje 40 g espresa, razmera 1:2">' +
      '<path d="M18 52h70" stroke="#3A2416" stroke-width="10" stroke-linecap="round"/><path d="M80 40h62l-6 30h-50z" fill="#B9C1C8" stroke="' + INK + '" stroke-width="2.5"/><path d="M88 46h46" stroke="#6E3B21" stroke-width="7"/>' +
      M(111, 100, "20 g", 18) + '<path d="M156 56h36" stroke="' + INK + '" stroke-width="3"/><path d="M186 49l9 7-9 7" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M212 34h56l-6 46a8 8 0 0 1-8 7h-28a8 8 0 0 1-8-7z" fill="#F3F5F7" stroke="' + INK + '" stroke-width="2.5"/><path d="M215 52h50l-3.6 27a6 6 0 0 1-6 5h-30.8a6 6 0 0 1-6-5z" fill="#3A1A0B"/><path d="M215 52h50l-.8 7h-48.4z" fill="#C98A4B"/>' +
      M(240, 110, "40 g", 18) + D(160, 134, "1 : 2", 26, "#C98417") + "</svg>",
    rules: () => '<svg viewBox="0 0 320 120" role="img" aria-label="Vaga: 18 grama, 25 sekundi">' +
      '<rect x="20" y="14" width="280" height="92" rx="16" fill="#2B2826" stroke="' + INK + '" stroke-width="2.5"/>' +
      LCD(36, 28, 120, 64, "18,0 g", "DOZA") + LCD(164, 28, 120, 64, "25 s", "VREME") + "</svg>",
    fist: () => {
      let loose = "", mid = "", tight = "";
      for (let i = 0; i < 26; i++) loose += '<circle cx="' + (232 + (i * 37 % 60) - 6) + '" cy="' + (64 + (i * 23 % 34)) + '" r="2.4" fill="#6E3B21"/>';
      for (let i = 0; i < 12; i++) mid += '<circle cx="' + (150 + (i * 29 % 46)) + '" cy="' + (76 + (i * 17 % 20)) + '" r="2.2" fill="#6E3B21"/>';
      tight = '<path d="M30 92c-4-22 14-36 34-34 22 2 32 18 26 34z" fill="#5A3019" stroke="' + INK + '" stroke-width="2"/>';
      return '<svg viewBox="0 0 320 140" role="img" aria-label="Test šake: presitno, taman, prekrupno">' + tight +
        '<path d="M132 84c-2-14 10-24 24-22 14 2 20 12 16 22z" fill="#5A3019" stroke="' + INK + '" stroke-width="2"/>' + mid + loose +
        T(60, 124, "presitno", 14, 800, "middle", "#D7263D") + T(160, 124, "taman", 14, 800, "middle", "#1E9A5D") + T(262, 124, "prekrupno", 14, 800, "middle", "#D7263D") +
        M(160, 30, "~5 g u šaci", 12) + "</svg>";
    },
    longer: () => '<svg viewBox="0 0 320 140" role="img" aria-label="Kraća ekstrakcija je jača, duža je slabija">' +
      '<path d="M54 40h70l-7 62a8 8 0 0 1-8 7H69a8 8 0 0 1-8-7z" fill="#F3F5F7" stroke="' + INK + '" stroke-width="2.5"/><path d="M58 64h62l-4.6 37a6 6 0 0 1-6 5H68.6a6 6 0 0 1-6-5z" fill="#2E140A"/><path d="M58 64h62l-.8 6H58.8z" fill="#C98A4B"/>' +
      '<path d="M194 22h80l-8 80a8 8 0 0 1-8 7h-48a8 8 0 0 1-8-7z" fill="#F3F5F7" stroke="' + INK + '" stroke-width="2.5"/><path d="M197 46h74l-6 55a6 6 0 0 1-6 5h-50a6 6 0 0 1-6-5z" fill="#8A4E2B"/><path d="M197 46h74l-.6 6H197.6z" fill="#D9A766"/>' +
      D(89, 134, "1:2 · JAČE", 20) + D(234, 134, "1:3 · SLABIJE", 20) + "</svg>",
    diffusion: () => {
      let parts = "", dots = "";
      [[44, 96], [62, 100], [80, 95], [98, 99], [116, 96], [52, 112], [72, 114], [92, 112], [110, 113]].forEach((p) => { parts += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="#6E3B21" stroke="' + INK + '" stroke-width="1.5"/>'; });
      [[214, 84], [252, 96], [234, 112], [272, 80]].forEach((p) => {
        parts += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8" fill="#6E3B21" stroke="' + INK + '" stroke-width="1.5"/>';
        for (let k = 0; k < 6; k++) { const a = k * 1.05; dots += '<circle cx="' + (p[0] + Math.cos(a) * 15).toFixed(1) + '" cy="' + (p[1] + Math.sin(a) * 15).toFixed(1) + '" r="1.8" fill="#A0612A"/>'; }
      });
      return '<svg viewBox="0 0 320 150" role="img" aria-label="Espresso erozija i filter difuzija">' +
        '<rect x="24" y="30" width="112" height="96" rx="12" fill="#F3F5F7" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M50 40v26M80 40v26M110 40v26" stroke="#2D6FD6" stroke-width="4" stroke-linecap="round"/><path d="M43 58l7 9 7-9M73 58l7 9 7-9M103 58l7 9 7-9" fill="none" stroke="#2D6FD6" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="184" y="30" width="112" height="96" rx="12" fill="#E1ECFB" stroke="' + INK + '" stroke-width="2.5"/>' + parts + dots +
        D(80, 22, "ESPRESSO · EROZIJA", 17) + D(240, 22, "FILTER · DIFUZIJA", 17) + T(80, 144, "pod pritiskom", 12, 700) + T(240, 144, "bez pritiska", 12, 700) + "</svg>";
    },
    filters: () => {
      let fib = "", weave = "", mesh = "";
      for (let i = 0; i < 9; i++) fib += '<path d="M' + (30 + i * 9) + " " + (40 + (i % 3) * 6) + "q8 " + (10 + i % 4) + " " + (2 + i % 5) + ' 30" stroke="#D9D2C8" stroke-width="1.5" fill="none"/>';
      for (let i = 0; i < 7; i++) weave += '<path d="M' + (126 + i * 10) + ' 36v66M126 ' + (40 + i * 10) + 'h70" stroke="#C4A980" stroke-width="3"/>';
      for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) mesh += '<circle cx="' + (232 + x * 11) + '" cy="' + (44 + y * 11) + '" r="3" fill="#6B747C"/>';
      return '<svg viewBox="0 0 320 150" role="img" aria-label="Papirni, platneni i metalni filter">' +
        '<rect x="24" y="32" width="76" height="74" rx="10" fill="#FFFFFF" stroke="' + INK + '" stroke-width="2.5"/>' + fib +
        '<rect x="122" y="32" width="76" height="74" rx="10" fill="#EFE2CC" stroke="' + INK + '" stroke-width="2.5"/>' + weave +
        '<rect x="220" y="32" width="76" height="74" rx="10" fill="#C9CFD5" stroke="' + INK + '" stroke-width="2.5"/>' + mesh +
        '<circle cx="62" cy="126" r="9" fill="#C98A4B"/><circle cx="160" cy="126" r="9" fill="#8A4E2B"/><circle cx="258" cy="126" r="9" fill="#3A1A0B"/>' +
        D(62, 24, "PAPIR", 18) + D(160, 24, "TKANINA", 18) + D(258, 24, "METAL", 18) + "</svg>";
    },
    methods: () => '<svg viewBox="0 0 320 150" role="img" aria-label="Protočna i imerziona metoda">' +
      '<path d="M40 40h80l-28 46H68z" fill="#FFFFFF" stroke="' + INK + '" stroke-width="2.5"/><path d="M56 50h48l-14 24H70z" fill="#6E3B21"/>' +
      '<path d="M80 92v10M80 108v10" stroke="#2D6FD6" stroke-width="4" stroke-linecap="round"/><path d="M58 120h44v8a8 8 0 0 1-8 8H66a8 8 0 0 1-8-8z" fill="#3A1A0B" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="206" y="44" width="68" height="88" rx="8" fill="#E1ECFB" stroke="' + INK + '" stroke-width="2.5"/><rect x="209" y="70" width="62" height="59" rx="6" fill="#4A2414"/><path d="M240 30v40M222 70h36" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
      D(80, 26, "PROTOČNA", 20) + D(240, 26, "IMERZIONA", 20) + "</svg>",
    ratio116: () => {
      let drops = "";
      for (let i = 0; i < 16; i++) {
        const x = 168 + (i % 8) * 18, y = 46 + Math.floor(i / 8) * 34;
        drops += '<path d="M' + x + " " + (y - 10) + "c5 6 8 9 8 13a8 8 0 0 1-16 0c0-4 3-7 8-13z" + '" fill="#5B93EA" stroke="' + INK + '" stroke-width="1.5"/>';
      }
      return '<svg viewBox="0 0 320 140" role="img" aria-label="Jedan gram kafe na šesnaest grama vode">' + bean(70, 60, 22, 30, -20) + drops +
        D(70, 124, "1 g KAFE", 22) + D(226, 124, "16 g VODE", 22) + D(126, 70, ":", 40) + "</svg>";
    },
    pour3: () => '<svg viewBox="0 0 320 150" role="img" aria-label="Latijera visoko pa blizu površine">' +
      '<path d="M40 24h40l-4 34H44z" fill="#DCE1E6" stroke="' + INK + '" stroke-width="2.5" transform="rotate(28 60 40)"/><path d="M78 56q6 20 2 50" stroke="#FFF8EE" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M78 56q6 20 2 50" stroke="' + INK + '" stroke-width="1" fill="none" opacity=".3"/>' +
      '<path d="M50 100h64l-6 30a8 8 0 0 1-8 7H64a8 8 0 0 1-8-7z" fill="#F3F5F7" stroke="' + INK + '" stroke-width="2.5"/><ellipse cx="82" cy="104" rx="29" ry="5" fill="#A0612A"/>' +
      '<path d="M206 80h40l-4 34h-32z" fill="#DCE1E6" stroke="' + INK + '" stroke-width="2.5" transform="rotate(48 226 96)"/>' +
      '<path d="M200 100h64l-6 30a8 8 0 0 1-8 7h-36a8 8 0 0 1-8-7z" fill="#F3F5F7" stroke="' + INK + '" stroke-width="2.5"/><ellipse cx="232" cy="104" rx="29" ry="5" fill="#A0612A"/><ellipse cx="236" cy="104" rx="10" ry="3" fill="#FFF8EE"/>' +
      T(82, 18, "1 · osnova sa visine", 12, 800) + T(232, 18, "2 · crtanje blizu", 12, 800) + "</svg>",
    "latte-set": () => '<div class="latte-row">' + ["heart", "tulip", "rosetta", "swan"].map((k, i) =>
      '<figure>' + latte(k) + "<figcaption>" + ["Srce", "Tulip", "Rozeta", "Labud"][i] + "</figcaption></figure>").join("") + "</div>"
  };
  function misc(name) {
    if (name && name.indexOf("latte-") === 0 && name !== "latte-set") return latte(name.slice(6));
    return MISC[name] ? MISC[name]() : "";
  }

  Z.art = { icon, avatar, avatars: AV, BEAN, medal, diagram, latte, misc };
})();
