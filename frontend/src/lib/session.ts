import { cookies } from "next/headers";
import { cache } from "react";
import type { Me } from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8001";
const SESSION_COOKIE = process.env.SESSION_COOKIE ?? "zpz_session";

/** Server-side: trenutni korisnik ili null ako sesija ne postoji ili je istekla. */
export const getMe = cache(async (): Promise<Me | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const res = await fetch(`${BACKEND_URL}/api/me`, {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Backend /api/me: ${res.status}`);
  return res.json();
});

export const jeOsoblje = (me: Me) => me.korisnik.uloga !== "polaznik";
