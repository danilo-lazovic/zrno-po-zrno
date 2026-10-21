"use client";

import { useEffect, useRef, useState } from "react";
import { ima3D, podesavanja, pokretac } from "@/igre/registar";
import { type RezultatOut, posaljiRezultat } from "@/igre/rezultat";
import type { IgraId, RezultatIgre } from "@/igre/ugovor";
import { BezMreze } from "@/lib/api";
import { confetti, sfx } from "@/lib/jezgro";
import type { Dobitak, Napredak } from "@/lib/napredak";
import { dodajURed, noviKljuc } from "@/lib/red";
import type { IgraOpis, Kurs } from "@/lib/sadrzaj";
import { Ikona } from "../Svg";

const KLJUC_3D = "zpz-3d";

/** 3D verzija je podrazumevana gde postoji; polaznik može da se vrati na klasičnu (pamti se na telefonu). */
function citaj3D() {
  try {
    return localStorage.getItem(KLJUC_3D) !== "0";
  } catch {
    return true;
  }
}

/** Igre koje imaju dugme "Igraj ponovo" (ostale same nude novu rundu, kao u artifactu). */
const PONOVO: IgraId[] = ["swipe", "dialin", "recipe"];

/** Igraonica (artifact app.js openGame): igra preko celog ekrana, rezultat ide serveru po ugovoru. */
export function Igra({
  kurs,
  igra,
  napredak,
  dobitak,
  zatvori,
}: {
  kurs: Kurs;
  igra: IgraOpis;
  napredak: Napredak;
  dobitak: (d: Dobitak) => void;
  zatvori: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [runda, setRunda] = useState(0);
  const [rezultat, setRezultat] = useState<RezultatOut | null>(null);
  const [greska, setGreska] = useState("");
  const [naCekanju, setNaCekanju] = useState(false);
  const id = igra.id as IgraId;
  const moze3D = ima3D(id);
  const [triD, setTriD] = useState(citaj3D);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setRezultat(null);
    setGreska("");
    setNaCekanju(false);
    // Brza runda pita samo iz nivoa koje je polaznik završio (bar prvi)
    const zavrseni = kurs.nivoi.filter((n) => napredak.nivoi[n.id]?.zavrsen);
    const pitanja = (zavrseni.length ? zavrseni : kurs.nivoi.slice(0, 1)).flatMap((n) => n.swipe);
    const { pokreni, izvor } = pokretac(id, moze3D && triD ? "3d" : igra.implementacija);
    const inst = pokreni(
      host,
      { igra_id: id, konfiguracija: { mod: "igraonica", pitanja }, podesavanja: podesavanja() },
      (r: RezultatIgre) => {
        if (r.zvezdice === 3) confetti.burst(70);
        posaljiRezultat(kurs.kurs.kljuc, { ...r, izvor }, "igraonica")
          .then((out) => {
            setRezultat(out);
            dobitak(out);
          })
          .catch((e: Error) => {
            if (e instanceof BezMreze) {
              dodajURed({ tip: "igra", kljuc: noviKljuc(), kurs: kurs.kurs.kljuc, rezultat: { ...r, izvor }, kontekst: "igraonica" });
              setNaCekanju(true);
            } else setGreska(`Rezultat nije sačuvan: ${e.message}`);
          });
      },
    );
    return () => inst.unisti();
    // napredak se ne prati: nova runda kreće samo na "Igraj ponovo"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runda, id, triD]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && zatvori();
    window.addEventListener("keydown", esc);
    document.body.classList.add("ov-open");
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.classList.remove("ov-open");
    };
  }, [zatvori]);

  const merilo = (n: number) => (id === "swipe" ? `${n} poena` : `${n}%`);

  return (
    <div id="ov">
      <div className="ls gv" style={{ "--mc": igra.color } as React.CSSProperties}>
        <div className="ls-top">
          <button type="button" className="icon-btn" aria-label="Zatvori" onClick={zatvori}>
            <Ikona ime="close" />
          </button>
          <h2 className="gv-title">{igra.t}</h2>
          {moze3D && (
            <button
              type="button"
              className="znak gv-3d"
              aria-pressed={triD}
              onClick={() => {
                const v = !triD;
                setTriD(v);
                try {
                  localStorage.setItem(KLJUC_3D, v ? "1" : "0");
                } catch {
                  /* bez skladišta: važi do zatvaranja */
                }
              }}
            >
              {triD ? "3D" : "Klasično"}
            </button>
          )}
          <span className="ls-xp">
            <Ikona ime="bean" />
            <b>{napredak.zrna}</b>
          </span>
        </div>
        <div className="ls-body">
          {/* igra crta sama u ovaj element (canvas ili Unity), React ga ne dira */}
          <div className="game-host" ref={hostRef} key={runda} />
        </div>
        <div className="ls-foot">
          {greska && (
            <p className="note bad" role="alert">
              <Ikona ime="info" />
              {greska}
            </p>
          )}
          {rezultat && (
            <p className="note ok" role="status">
              <Ikona ime={rezultat.rekord ? "trophy" : "bean"} />
              {rezultat.rekord ? `Novi rekord: ${merilo(rezultat.najbolje)}! ` : `Najbolje: ${merilo(rezultat.najbolje)}. `}
              {rezultat.zrna > 0 ? `+${rezultat.zrna} zrna` : "Za danas si iz ove igre pokupio sva zrna, igraj za rekord."}
            </p>
          )}
          {naCekanju && (
            <p className="note" role="status">
              <Ikona ime="clock" />
              Bez mreže: rezultat je sačuvan na telefonu, zrna stižu kad se veza vrati.
            </p>
          )}
          {(rezultat || naCekanju) && PONOVO.includes(id) && (
            <button
              type="button"
              className="btn btn-big"
              onClick={() => {
                sfx.tap();
                setRunda((r) => r + 1);
              }}
            >
              Igraj ponovo
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={zatvori}>
            Nazad u igraonicu
          </button>
        </div>
      </div>
    </div>
  );
}
