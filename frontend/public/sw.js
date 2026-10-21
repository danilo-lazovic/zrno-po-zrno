/* Zrno po zrno: service worker za rad bez mreže (Modul 6).
 *
 * - /_next/static: keš zauvek (imena fajlova se menjaju sa svakim buildom)
 * - slike, ikone, fontovi: keš, osvežava se u pozadini
 * - početna strana i API koji polaznik čita (sadržaj, napredak, test, me): prvo mreža, bez nje poslednji sačuvan
 * - POST zahtevi nikad ne idu u keš; ono što polaznik uradi bez mreže čuva aplikacija (lib/red.ts)
 */
const VERZIJA = "zpz-1";
const STATIKA = `zpz-statika-${VERZIJA}`;
const STRANE = "zpz-strane";
const API = "zpz-api";
const API_ZA_CITANJE = [/^\/api\/me$/, /^\/api\/sadrzaj\/[^/]+$/, /^\/api\/napredak\/[^/]+$/, /^\/api\/test\/[^/]+$/];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIKA).then((c) => c.addAll(["/offline.html", "/ikone/ikona-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((k) => Promise.all(k.filter((x) => x.startsWith("zpz-statika-") && x !== STATIKA).map((x) => caches.delete(x))))
      .then(() => self.clients.claim()),
  );
});

// aplikacija javlja slike iz kursa, da lekcije bez mreže imaju i njih
self.addEventListener("message", (e) => {
  if (e.data?.tip !== "sacuvaj" || !Array.isArray(e.data.urls)) return;
  e.waitUntil(
    caches.open(STATIKA).then(async (c) => {
      for (const u of e.data.urls) {
        if (typeof u !== "string" || !u.startsWith("/")) continue;
        if (!(await c.match(u))) await c.add(u).catch(() => {});
      }
    }),
  );
});

const bezMreze = () =>
  new Response(JSON.stringify({ detail: "Nema veze sa serverom." }), {
    status: 503,
    headers: { "content-type": "application/json", "x-zpz-offline": "1" },
  });

async function prvoMreza(req, kes, kljuc) {
  try {
    const res = await fetch(req);
    // preusmerenje na prijavu ili greška se ne čuvaju
    if (res.ok && !res.redirected) (await caches.open(kes)).put(kljuc ?? req, res.clone());
    return res;
  } catch {
    return (await caches.match(kljuc ?? req, { cacheName: kes, ignoreVary: true })) ?? null;
  }
}

async function prvoKes(req) {
  const sacuvan = await caches.match(req, { cacheName: STATIKA });
  if (sacuvan) return sacuvan;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") (await caches.open(STATIKA)).put(req, res.clone());
  return res;
}

async function kesPaMreza(req, e) {
  const sacuvan = await caches.match(req, { cacheName: STATIKA });
  const mreza = fetch(req)
    .then(async (res) => {
      if (res.ok || res.type === "opaque") await (await caches.open(STATIKA)).put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (sacuvan) {
    e.waitUntil(mreza);
    return sacuvan;
  }
  return (await mreza) ?? Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(kesPaMreza(req, e));
    return;
  }

  // polaznička aplikacija je jedna strana; admin uvek ide na mrežu
  if (req.mode === "navigate") {
    if (url.pathname !== "/") return;
    e.respondWith(
      prvoMreza(req, STRANE, "/").then(async (r) => r ?? (await caches.match("/offline.html", { cacheName: STATIKA, ignoreVary: true })) ?? Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) return e.respondWith(prvoKes(req));
  if (/^\/(img|ikone)\//.test(url.pathname) || url.pathname.startsWith("/api/slike/") || url.pathname === "/icon.svg") {
    return e.respondWith(kesPaMreza(req, e));
  }
  if (API_ZA_CITANJE.some((r) => r.test(url.pathname))) {
    e.respondWith(prvoMreza(req, API).then((r) => r ?? bezMreze()));
  }
});
