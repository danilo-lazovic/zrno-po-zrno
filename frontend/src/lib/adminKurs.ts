"use client";

/** Kurs čija se statistika gleda u adminu; bira se u meniju kad ima više objavljenih kurseva (Modul 6d). */

import { useEffect, useState } from "react";

const KLJUC = "zpz-admin-kurs";
const DOGADJAJ = "zpz-admin-kurs";

export type KursAdmin = {
  kljuc: string;
  naziv: string;
  opis: string | null;
  aktivan: boolean;
  redosled: number;
  preduslov: string | null;
  verzija: number | null;
  nacrt: boolean;
  nivoa: number;
};

function sacuvan(): string {
  try {
    return localStorage.getItem(KLJUC) || "osnovni";
  } catch {
    return "osnovni";
  }
}

export function postaviAdminKurs(k: string) {
  try {
    localStorage.setItem(KLJUC, k);
  } catch {
    /* bez skladišta: važi do osvežavanja */
  }
  window.dispatchEvent(new CustomEvent(DOGADJAJ, { detail: k }));
}

/** null dok se ne pročita izbor (stranica tada još ne učitava podatke, da ne bi učitala dvaput). */
export function useAdminKurs(): string | null {
  const [k, setK] = useState<string | null>(null);
  useEffect(() => {
    setK(sacuvan());
    const promena = (e: Event) => setK((e as CustomEvent<string>).detail);
    window.addEventListener(DOGADJAJ, promena);
    return () => window.removeEventListener(DOGADJAJ, promena);
  }, []);
  return k;
}

/** ?kurs=...&lokal_id=... */
export function upit(kurs: string, polja: Record<string, string | undefined> = {}) {
  const p = new URLSearchParams({ kurs });
  for (const [k, v] of Object.entries(polja)) if (v) p.set(k, v);
  return `?${p}`;
}
