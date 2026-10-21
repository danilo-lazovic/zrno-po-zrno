"use client";

import { avatar } from "@/lib/art";
import { datum, type Sertifikat } from "@/lib/test";
import { toast } from "@/lib/toast";
import { Ikona, Svg } from "../Svg";

/** Sertifikat (artifact app.js certHTML). Kod proverava trener u adminu, protiv servera. */
export function SertifikatKartica({
  ime,
  av,
  s,
  nivoa,
}: {
  ime: string;
  av: string | null;
  s: Sertifikat;
  nivoa: number;
}) {
  async function kopiraj() {
    try {
      await navigator.clipboard.writeText(s.kod);
      toast("Kod je kopiran.");
    } catch {
      toast(`Kopiraj kod ručno: ${s.kod}`);
    }
  }

  return (
    <>
      <div className="cert">
        <div className="cert-band">
          <span>Zrno po zrno</span>
          <span>Barista minimum</span>
        </div>
        <div className="cert-body">
          <div className="cert-av">
            <Svg html={avatar(av ?? "zrno")} />
          </div>
          <p className="cert-l">Sertifikat izdat za</p>
          <h3 className="cert-name">{ime}</h3>
          <p className="cert-l">Položen završni test pre kursa</p>
          <div className="cert-row">
            <div>
              <b>{s.procenat}%</b>
              <span>rezultat</span>
            </div>
            <div>
              <b>{datum(s.izdat_u)}</b>
              <span>datum</span>
            </div>
            <div>
              <b>
                {nivoa}/{nivoa}
              </b>
              <span>nivoa</span>
            </div>
          </div>
          <div className="cert-code">
            <span>Kod za trenera</span>
            <b>{s.kod}</b>
          </div>
        </div>
        <span className="cert-stamp" aria-hidden="true">
          Spreman
          <br />
          za kurs
        </span>
      </div>
      <div className="cert-act">
        <button type="button" className="btn" onClick={kopiraj}>
          <Ikona ime="copy" />
          Kopiraj kod
        </button>
      </div>
      <p className="hint">Napravi screenshot sertifikata i pošalji ga treneru pre prvog dana.</p>
    </>
  );
}
