"use client";

import { obrisiKes } from "@/lib/pwa";

export function Odjava({ className, pre }: { className?: string; pre?: () => boolean }) {
  async function odjavi() {
    if (pre && !pre()) return;
    await fetch("/api/auth/odjava", { method: "POST" }).catch(() => {});
    await obrisiKes();
    window.location.href = "/prijava";
  }
  return (
    <button type="button" className={className ?? "linkish"} onClick={odjavi}>
      Odjavi se
    </button>
  );
}
