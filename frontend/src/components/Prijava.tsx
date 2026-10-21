"use client";

import { useState } from "react";
import { AuthOkvir } from "./AuthOkvir";
import { Ikona } from "./Svg";

/** Polaznik: korisničko ime + PIN (numerička tastatura). Osoblje: email + lozinka. */
export function Prijava() {
  const [osoblje, setOsoblje] = useState(false);
  const [ime, setIme] = useState("");
  const [tajna, setTajna] = useState("");
  const [greska, setGreska] = useState("");
  const [salje, setSalje] = useState(false);

  async function posalji(e: React.FormEvent) {
    e.preventDefault();
    setGreska("");
    setSalje(true);
    const res = await fetch("/api/auth/prijava", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ korisnicko_ime: ime, tajna }),
    });
    if (res.ok) {
      window.location.href = osoblje ? "/admin" : "/";
      return;
    }
    const telo = await res.json().catch(() => null);
    setGreska(typeof telo?.detail === "string" ? telo.detail : "Prijava nije uspela.");
    setTajna("");
    setSalje(false);
  }

  return (
    <AuthOkvir>
      <h1 className="h1">Prijava</h1>
      <p className="sub">
        {osoblje ? "Za trenere, menadžere i admine. Nalog otvara admin." : "Za polaznike obuke: korisničko ime i PIN iz pozivnice."}
      </p>
      <form onSubmit={posalji}>
        <label htmlFor="ime">{osoblje ? "Email" : "Korisničko ime"}</label>
        <input
          id="ime"
          className="inp"
          value={ime}
          onChange={(e) => setIme(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          type={osoblje ? "email" : "text"}
          placeholder={osoblje ? "ime@kafeterija.rs" : "ime.prezime"}
          required
        />
        <label htmlFor="tajna">{osoblje ? "Lozinka" : "PIN"}</label>
        {osoblje ? (
          <input
            id="tajna"
            className="inp"
            type="password"
            value={tajna}
            onChange={(e) => setTajna(e.target.value)}
            autoComplete="current-password"
            required
          />
        ) : (
          <input
            id="tajna"
            className="inp pin"
            type="password"
            inputMode="numeric"
            pattern="\d{4,6}"
            maxLength={6}
            value={tajna}
            onChange={(e) => setTajna(e.target.value.replace(/\D/g, ""))}
            autoComplete="current-password"
            required
          />
        )}
        {greska && (
          <p className="greska" role="alert">
            <Ikona ime="info" />
            {greska}
          </p>
        )}
        <button type="submit" className="btn btn-gold btn-big" disabled={salje}>
          Uđi
        </button>
      </form>
      {!osoblje && <p className="napomena">Nemaš PIN ili si ga zaboravio? Traži novi pozivni link od trenera ili menadžera.</p>}
      <div className="prekidac">
        <button
          type="button"
          className="linkish"
          onClick={() => {
            setOsoblje(!osoblje);
            setGreska("");
            setTajna("");
          }}
        >
          {osoblje ? "Prijava za polaznike" : "Prijava za osoblje"}
        </button>
      </div>
    </AuthOkvir>
  );
}
