"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { type KursAdmin, postaviAdminKurs, useAdminKurs } from "@/lib/adminKurs";
import { api } from "@/lib/api";
import { NAZIV_ULOGE, type Me, type Uloga } from "@/lib/types";
import { Odjava } from "../Odjava";
import { Ikona } from "../Svg";

const SVI: Uloga[] = ["admin", "trener", "menadzer"];

type Stavka = { href: string; naziv: string; ikona: string; uloge: Uloga[] };

// grupe kao u sidebaru portala
const GRUPE: { naziv: string; stavke: Stavka[] }[] = [
  {
    naziv: "Obuka",
    stavke: [
      { href: "/admin", naziv: "Pregled", ikona: "gauge", uloge: SVI },
      { href: "/admin/polaznici", naziv: "Polaznici", ikona: "user", uloge: SVI },
      { href: "/admin/sertifikati", naziv: "Sertifikati", ikona: "trophy", uloge: SVI },
      { href: "/admin/rang", naziv: "Rang lista", ikona: "star", uloge: SVI },
    ],
  },
  {
    naziv: "Statistika",
    stavke: [
      { href: "/admin/pitanja", naziv: "Pitanja", ikona: "target", uloge: SVI },
      { href: "/admin/igre", naziv: "Igre", ikona: "arcade", uloge: SVI },
    ],
  },
  {
    naziv: "Ostalo",
    stavke: [
      { href: "/admin/sadrzaj", naziv: "Sadržaj", ikona: "edit", uloge: ["admin", "trener"] },
      { href: "/admin/lokali", naziv: "Lokali", ikona: "cup", uloge: ["admin"] },
      { href: "/admin/osoblje", naziv: "Osoblje", ikona: "user", uloge: ["admin"] },
    ],
  },
];

export function AdminNav({ me }: { me: Me }) {
  const putanja = usePathname();
  const kurs = useAdminKurs();
  const [kursevi, setKursevi] = useState<KursAdmin[]>([]);
  useEffect(() => {
    api<KursAdmin[]>("/api/admin/kursevi")
      .then((l) => setKursevi(l.filter((k) => k.verzija !== null)))
      .catch(() => {});
  }, []);
  return (
    <nav className="adm-nav" aria-label="Admin meni">
      <Link href="/admin" className="adm-brend">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/kafeterija-banner.png" alt="Kafeterija" width={1400} height={336} />
        <span className="label">Obuka · Zrno po zrno</span>
      </Link>
      {kursevi.length > 1 && kurs && (
        <label className="adm-kurs">
          <span>Statistika za kurs</span>
          <select className="inp" value={kurs} onChange={(e) => postaviAdminKurs(e.target.value)}>
            {kursevi.map((k) => (
              <option key={k.kljuc} value={k.kljuc}>
                {k.naziv}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="adm-grupe">
        {GRUPE.map((g) => {
          const stavke = g.stavke.filter((s) => s.uloge.includes(me.korisnik.uloga));
          if (!stavke.length) return null;
          return (
            <div key={g.naziv} className="adm-grupa">
              <span className="label">{g.naziv}</span>
              {stavke.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="adm-link"
                  aria-current={(s.href === "/admin" ? putanja === s.href : putanja.startsWith(s.href)) ? "page" : undefined}
                >
                  <Ikona ime={s.ikona} />
                  {s.naziv}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
      <div className="adm-ja">
        <b>
          {me.korisnik.ime} {me.korisnik.prezime}
        </b>
        <span>
          {NAZIV_ULOGE[me.korisnik.uloga]}
          {me.lokali && me.lokali.length > 0 && ` · ${me.lokali.map((l) => l.naziv).join(", ")}`}
        </span>
        <Odjava />
      </div>
    </nav>
  );
}
