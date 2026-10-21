import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8001";

const nextConfig: NextConfig = {
  // Dev server inače blokira svoje skripte kad se aplikacija otvara sa telefona preko tunela
  allowedDevOrigins: ["*.trycloudflare.com"],
  // Browser priča samo sa Next-om, pa je sesijski cookie first-party i nema CORS-a.
  // service worker se uvek proverava sa servera, da nova verzija aplikacije stigne odmah
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
