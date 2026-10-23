import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8001";

const nextConfig: NextConfig = {
  // Dev server blokira svoje skripte za svaku adresu osim localhost-a, pa je na telefonu prazan ekran.
  // Dozvoljene su lokalne mreže (telefon na istom Wi-Fi-ju otvara http://192.168.x.x:3001), *.local imena
  // i tunel; druge adrese idu u DEV_ORIGINS, odvojene zarezom (npr. DEV_ORIGINS=moj-laptop.lan).
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "*.local",
    "*.trycloudflare.com",
    ...(process.env.DEV_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  ],
  // Browser priča samo sa Next-om, pa je sesijski cookie first-party i nema CORS-a.
  // service worker se uvek proverava sa servera, da nova verzija aplikacije stigne odmah
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      // pregledači i dalje traže /favicon.ico mimo <link rel="icon">
      { source: "/favicon.ico", destination: "/ikone/ikona-192.png" },
    ];
  },
};

export default nextConfig;
