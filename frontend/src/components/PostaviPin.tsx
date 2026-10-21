"use client";

import { useState } from "react";

type Info = { ime: string; korisnicko_ime: string; lokal: string | null };

export function PostaviPin({ token, info }: { token: string; info: Info }) {
  const [pin, setPin] = useState("");
  const [ponovo, setPonovo] = useState("");
  const [greska, setGreska] = useState("");
  const [salje, setSalje] = useState(false);

  async function posalji(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== ponovo) {
      setGreska("PIN-ovi se ne poklapaju.");
      return;
    }
    setGreska("");
    setSalje(true);
    const res = await fetch(`/api/pozivnica/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    const telo = await res.json().catch(() => null);
    setGreska(typeof telo?.detail === "string" ? telo.detail : "PIN ima 4 do 6 cifara.");
    setSalje(false);
  }

  const polje = (id: string, vrednost: string, postavi: (v: string) => void) => (
    <input
      id={id}
      className="inp pin"
      type="password"
      inputMode="numeric"
      pattern="\d{4,6}"
      minLength={4}
      maxLength={6}
      value={vrednost}
      onChange={(e) => postavi(e.target.value.replace(/\D/g, ""))}
      autoComplete="new-password"
      required
    />
  );

  return (
    <>
      <p className="label">Dobrodošao{info.lokal ? ` · ${info.lokal}` : ""}</p>
      <h1 className="h1">Zdravo, {info.ime}!</h1>
      <p className="sub">Postavi PIN i krećeš. Zapamti i korisničko ime, trebaće ti za prijavu na drugom telefonu.</p>
      <p className="ko">
        Korisničko ime: <b>{info.korisnicko_ime}</b>
      </p>
      <form onSubmit={posalji}>
        <label htmlFor="pin">PIN (4 do 6 cifara)</label>
        {polje("pin", pin, setPin)}
        <label htmlFor="ponovo">Ponovi PIN</label>
        {polje("ponovo", ponovo, setPonovo)}
        {greska && (
          <p className="greska" role="alert">
            {greska}
          </p>
        )}
        <button type="submit" className="btn btn-gold btn-big" disabled={salje}>
          Kreni
        </button>
      </form>
    </>
  );
}
