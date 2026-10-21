/** Obaveštenja na vrhu ekrana, jedno po jedno (artifact app.js toast). */

const red: [string, string | undefined][] = [];
let zauzet = false;

/** html je naš markup (ikonice, nazivi iz sadržaja kroz md/esc), ne korisnički unos. */
export function toast(html: string, vrsta?: "gold" | "badge") {
  red.push([html, vrsta]);
  if (!zauzet) sledeci();
}

function sledeci() {
  const it = red.shift();
  if (!it) {
    zauzet = false;
    return;
  }
  zauzet = true;
  let el = document.querySelector<HTMLDivElement>(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.innerHTML = it[0];
  el.className = "toast" + (it[1] ? " toast-" + it[1] : "");
  void el.offsetWidth;
  el.classList.add("show");
  setTimeout(() => {
    el!.classList.remove("show");
    setTimeout(sledeci, 260);
  }, 2400);
}
