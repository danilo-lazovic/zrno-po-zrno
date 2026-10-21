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

const STAVKE: { href: string; naziv: string; uloge: Uloga[] }[] = [
  { href: "/admin", naziv: "Pregled", uloge: SVI },
  { href: "/admin/polaznici", naziv: "Polaznici", uloge: SVI },
  { href: "/admin/sertifikati", naziv: "Sertifikati", uloge: SVI },
  { href: "/admin/pitanja", naziv: "Pitanja", uloge: SVI },
  { href: "/admin/igre", naziv: "Igre", uloge: SVI },
  { href: "/admin/rang", naziv: "Rang lista", uloge: SVI },
  { href: "/admin/sadrzaj", naziv: "Sadržaj", uloge: ["admin", "trener"] },
  { href: "/admin/lokali", naziv: "Lokali", uloge: ["admin"] },
  { href: "/admin/osoblje", naziv: "Osoblje", uloge: ["admin"] },
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
      <div className="auth-logo">
        <Ikona ime="bean" />
        Zrno po zrno
      </div>
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
      {STAVKE.filter((s) => s.uloge.includes(me.korisnik.uloga)).map((s) => (
        <Link key={s.href} href={s.href} aria-current={(s.href === "/admin" ? putanja === s.href : putanja.startsWith(s.href)) ? "page" : undefined}>
          {s.naziv}
        </Link>
      ))}
      <div className="adm-ja">
        <b>
          {me.korisnik.ime} {me.korisnik.prezime}
        </b>
        {NAZIV_ULOGE[me.korisnik.uloga]}
        {me.lokali && me.lokali.length > 0 && ` · ${me.lokali.map((l) => l.naziv).join(", ")}`}
        <Odjava />
      </div>
    </nav>
  );
}
