"use client";

import { useState } from "react";
import { avatar, avatars } from "@/lib/art";
import { sfx } from "@/lib/jezgro";
import { Ikona, Svg } from "../Svg";

/** Prvo pokretanje (artifact app.js openOnboarding). Ime je već na nalogu, pa se bira samo avatar. */
export function Uvod({ ime, sacuvaj }: { ime: string; sacuvaj: (avatar: string) => Promise<void> }) {
  const [korak, setKorak] = useState(0);
  const [av, setAv] = useState("zrno");
  const [salje, setSalje] = useState(false);
  const [greska, setGreska] = useState("");

  async function gotovo() {
    setSalje(true);
    try {
      await sacuvaj(av);
    } catch (e) {
      setGreska((e as Error).message);
      setSalje(false);
    }
  }

  return (
    <div id="ov">
      {korak === 0 && (
        <div className="onb">
          <div className="onb-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/hero.jpg" alt="Espresso curi iz portafiltera u dve šoljice" />
            <div className="onb-title">
              <span className="onb-sticker">barista minimum</span>
              <h1>
                Zrno
                <br />
                po
                <br />
                zrno
              </h1>
            </div>
          </div>
          <div className="onb-body">
            <p className="onb-lead">
              Zdravo, {ime}! Pre prvog dana kursa prođi 8 kratkih nivoa, od trešnje do latte arta. Igraj, skupljaj zrna i
              dođi spreman.
            </p>
            <button
              type="button"
              className="btn btn-gold btn-big"
              onClick={() => {
                sfx.unlock();
                sfx.tap();
                setKorak(1);
              }}
              autoFocus
            >
              Kreni
            </button>
          </div>
        </div>
      )}
      {korak === 1 && (
        <div className="onb onb-form">
          <div className="onb-body">
            <p className="eyebrow">Korak 1 od 2</p>
            <h2 className="h1">Izaberi avatar</h2>
            <div className="avs-grid">
              {Object.entries(avatars as Record<string, { t: string }>).map(([k, a]) => (
                <button
                  key={k}
                  type="button"
                  className={`avpick${k === av ? " on" : ""}`}
                  aria-label={a.t}
                  aria-pressed={k === av}
                  onClick={() => {
                    setAv(k);
                    sfx.tap();
                  }}
                >
                  <Svg html={avatar(k)} />
                  <span>{a.t}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-gold btn-big"
              onClick={() => {
                sfx.ok();
                setKorak(2);
              }}
            >
              Dalje
            </button>
          </div>
        </div>
      )}
      {korak === 2 && (
        <div className="onb onb-form">
          <div className="onb-body">
            <p className="eyebrow">Korak 2 od 2</p>
            <h2 className="h1">Kako ide</h2>
            <ul className="how">
              <li>
                <Ikona ime="path" />
                <div>
                  <b>8 nivoa, 6–10 min svaki</b>
                  <span>Kratke kartice, klipovi i pitanja. Sve iz skripte za kurs.</span>
                </div>
              </li>
              <li>
                <Ikona ime="bean" />
                <div>
                  <b>Zrna, niz dana i bedževi</b>
                  <span>Svaki tačan odgovor donosi zrna. Uči svaki dan i čuvaj niz.</span>
                </div>
              </li>
              <li>
                <Ikona ime="arcade" />
                <div>
                  <b>Igre</b>
                  <span>Odradi smenu u Kafeteriji, brzu rundu i složi recepte.</span>
                </div>
              </li>
              <li>
                <Ikona ime="trophy" />
                <div>
                  <b>Završni test: 80%</b>
                  <span>Dobijaš sertifikat koji trener proverava prvog dana.</span>
                </div>
              </li>
            </ul>
            {greska && <p className="note bad">{greska}</p>}
            <button type="button" className="btn btn-gold btn-big" onClick={gotovo} disabled={salje} autoFocus>
              Prvi nivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
