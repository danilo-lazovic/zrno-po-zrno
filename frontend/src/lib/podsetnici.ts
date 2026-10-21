/**
 * Podsetnici u aplikaciji (Modul 6b): bez push poruka, vide se kad polaznik otvori aplikaciju.
 * Računaju se iz napretka; prikazuje se jedan, najvažniji, a "Kasnije" ga sklanja do sutra.
 */

import type { Napredak } from "./napredak";
import { type Kurs, type Nivo, mnozina } from "./sadrzaj";

export type Akcija = { naziv: string } & ({ tip: "nivo"; nivo: Nivo } | { tip: "kartice" } | { tip: "igre" });

export type Podsetnik = { id: string; ikona: string; naslov: string; tekst: string; akcija: Akcija };

/** Kalendarski dan u Beogradu (isti kao na serveru za niz dana i dnevni cilj). */
export function danasBG(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade" }).format(d);
}

const daniIzmedju = (od: string, do_: string) => Math.round((Date.parse(do_) - Date.parse(od)) / 86_400_000);

export function podsetnici(kurs: Kurs, n: Napredak, danas = danasBG()): Podsetnik[] {
  const nivoi = kurs.nivoi;
  const zavrsen = (id: string) => !!n.nivoi[id]?.zavrsen;
  const tekuci = nivoi.find((x, i) => !zavrsen(x.id) && (i === 0 || zavrsen(nivoi[i - 1].id)));
  const dalje: Akcija = tekuci ? { tip: "nivo", nivo: tekuci, naziv: `Nivo ${tekuci.n}` } : { tip: "igre", naziv: "Igraonica" };
  const cilj = kurs.podesavanja.dnevni_cilj;
  const out: Podsetnik[] = [];

  // "Završni test te čeka" ne treba: Put tada ionako ima veliko dugme za test
  if (n.niz_dana >= 2 && n.danas_zrna === 0)
    out.push({
      id: "niz",
      ikona: "flame",
      naslov: `Sačuvaj niz od ${n.niz_dana} dana`,
      tekst: "Danas još nemaš zrna. Jedno tačno pitanje ili runda igre je dovoljna da niz ostane.",
      akcija: dalje,
    });

  const pola = n.nedovrsen && nivoi.find((x) => x.id === n.nedovrsen!.nivo);
  if (pola && !zavrsen(pola.id))
    out.push({
      id: `nastavi-${pola.id}`,
      ikona: "play",
      naslov: `Nivo ${pola.n} je ostao na pola`,
      tekst: `${pola.title}: pređi ga do kraja i otključaj sledeći nivo.`,
      akcija: { tip: "nivo", nivo: pola, naziv: "Nastavi" },
    });

  if (n.poslednji_dan) {
    const pauza = daniIzmedju(n.poslednji_dan, danas);
    if (pauza >= 3)
      out.push({
        id: "povratak",
        ikona: "cards",
        naslov: "Dugo te nije bilo",
        tekst: `Poslednji put pre ${pauza} ${mnozina(pauza, "dan", "dana", "dana")}. Kreni lagano: prelistaj kartice da se podsetiš.`,
        akcija: { tip: "kartice", naziv: "Kartice" },
      });
  }

  const ponovi = kurs.pojmovi.filter((p) => zavrsen(p.nivo) && n.kartice[p.id] === false).length;
  if (ponovi >= 3)
    out.push({
      id: "kartice",
      ikona: "cards",
      naslov: `${ponovi} ${mnozina(ponovi, "kartica čeka", "kartice čekaju", "kartica čeka")} ponavljanje`,
      tekst: "Pojmovi koje si označio sa „Ponovi”. Ponavljanje pre testa se isplati.",
      akcija: { tip: "kartice", naziv: "Ponovi" },
    });

  const slab = nivoi.find((x) => n.nivoi[x.id]?.zavrsen && n.nivoi[x.id].zvezdice === 1);
  if (slab && !n.test.polozen)
    out.push({
      id: `zvezdica-${slab.id}`,
      ikona: "star",
      naslov: `Nivo ${slab.n} ima jednu zvezdicu`,
      tekst: `${slab.title}: ponovi ga i podigni tačnost pre završnog testa.`,
      akcija: { tip: "nivo", nivo: slab, naziv: "Ponovi" },
    });

  if (n.danas_zrna > 0 && n.danas_zrna < cilj)
    out.push({
      id: "cilj",
      ikona: "target",
      naslov: `Još ${cilj - n.danas_zrna} ${mnozina(cilj - n.danas_zrna, "zrno", "zrna", "zrna")} do dnevnog cilja`,
      tekst: `Danas imaš ${n.danas_zrna} od ${cilj}.`,
      akcija: dalje,
    });

  return out;
}

// ---------- "Kasnije": sklanja podsetnik do sutra ----------

const kljuc = (korisnik: number) => `zpz-podsetnici-${korisnik}`;

export function odlozeni(korisnik: number, danas = danasBG()): Set<string> {
  try {
    const sve: Record<string, string> = JSON.parse(localStorage.getItem(kljuc(korisnik)) ?? "{}");
    return new Set(Object.keys(sve).filter((id) => sve[id] === danas));
  } catch {
    return new Set();
  }
}

export function odlozi(korisnik: number, id: string, danas = danasBG()) {
  try {
    const sve: Record<string, string> = JSON.parse(localStorage.getItem(kljuc(korisnik)) ?? "{}");
    // stari dani ne trebaju
    const danasnji = Object.fromEntries(Object.entries(sve).filter(([, d]) => d === danas));
    localStorage.setItem(kljuc(korisnik), JSON.stringify({ ...danasnji, [id]: danas }));
  } catch {
    /* bez skladišta: podsetnik se vraća pri sledećem otvaranju */
  }
}
