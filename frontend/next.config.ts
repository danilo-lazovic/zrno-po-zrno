import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Dev server inače blokira svoje skripte kad se aplikacija otvara sa telefona preko tunela
  allowedDevOrigins: ["*.trycloudflare.com"],
  // Browser priča samo sa Next-om, pa je sesijski cookie first-party i nema CORS-a.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
