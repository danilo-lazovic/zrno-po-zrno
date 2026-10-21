/** Aplikacija na telefonu: service worker (public/sw.js) i instalacija na početni ekran. */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let ponuda: InstallEvent | null = null;
const slusaoci = new Set<() => void>();
const javi = () => slusaoci.forEach((f) => f());

if (typeof window !== "undefined") {
  // Chrome i Android nude instalaciju jednom; čuvamo događaj dok polaznik ne pritisne "Instaliraj"
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    ponuda = e as InstallEvent;
    javi();
  });
  window.addEventListener("appinstalled", () => {
    ponuda = null;
    javi();
  });
}

export function registrujSW() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    /* bez service workera aplikacija radi, samo ne i bez mreže */
  });
}

/** Slike iz kursa idu u keš odmah, da lekcije bez mreže imaju i slike. */
export function sacuvajZaOffline(urls: string[]) {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((r) => r.active?.postMessage({ tip: "sacuvaj", urls })).catch(() => {});
}

/** Odjava na deljenom telefonu: brišu se sačuvane stranice i podaci sa servera. */
export async function obrisiKes() {
  if (!("caches" in window)) return;
  await Promise.all(["zpz-strane", "zpz-api"].map((k) => caches.delete(k)));
}

export type StanjeInstalacije = "instalirana" | "moze" | "ios" | "ne";

export function stanjeInstalacije(): StanjeInstalacije {
  if (typeof window === "undefined") return "ne";
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return "instalirana";
  if (ponuda) return "moze";
  // iPhone i iPad nemaju dugme za instalaciju: Deli → Dodaj na početni ekran
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  return "ne";
}

export function pratiInstalaciju(f: () => void) {
  slusaoci.add(f);
  return () => {
    slusaoci.delete(f);
  };
}

export async function instaliraj() {
  if (!ponuda) return;
  await ponuda.prompt();
  await ponuda.userChoice;
  ponuda = null;
  javi();
}
