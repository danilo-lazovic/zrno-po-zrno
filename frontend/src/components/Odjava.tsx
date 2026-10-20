"use client";

export function Odjava({ className }: { className?: string }) {
  async function odjavi() {
    await fetch("/api/auth/odjava", { method: "POST" });
    window.location.href = "/prijava";
  }
  return (
    <button type="button" className={className ?? "linkish"} onClick={odjavi}>
      Odjavi se
    </button>
  );
}
