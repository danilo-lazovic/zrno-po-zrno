"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Lokal } from "@/lib/types";

/** Filter po lokalu; menadžer sa jednim lokalom ga ne vidi. */
export function IzborLokala({ vrednost, promeni }: { vrednost: string; promeni: (v: string) => void }) {
  const [lokali, setLokali] = useState<Lokal[]>([]);
  useEffect(() => {
    api<Lokal[]>("/api/admin/lokali")
      .then((l) => setLokali(l.filter((x) => x.aktivan)))
      .catch(() => {});
  }, []);
  if (lokali.length < 2) return null;
  return (
    <select className="inp" value={vrednost} onChange={(e) => promeni(e.target.value)} aria-label="Lokal">
      <option value="">Svi lokali</option>
      {lokali.map((l) => (
        <option key={l.id} value={l.id}>
          {l.naziv}
        </option>
      ))}
    </select>
  );
}
