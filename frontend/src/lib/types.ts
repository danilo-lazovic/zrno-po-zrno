export type Uloga = "admin" | "trener" | "menadzer" | "polaznik";

export type Lokal = {
  id: number;
  naziv: string;
  grad: string | null;
  format: string | null;
  aktivan: boolean;
  /** portal (iz Kafeterija Portala), rucno ili demo */
  izvor: string;
};

export type Me = {
  korisnik: { id: number; ime: string; prezime: string; korisnicko_ime: string; uloga: Uloga; avatar: string | null };
  lokal: Lokal | null;
  /** null: vidi sve lokale (admin, trener) */
  lokali: Lokal[] | null;
};

export type StatusPolaznika = "pozvan" | "aktivan" | "zakljucan" | "iskljucen";

export type Polaznik = {
  id: number;
  ime: string;
  prezime: string;
  korisnicko_ime: string;
  lokal: Lokal | null;
  status: StatusPolaznika;
  poslednja_prijava: string | null;
  kreiran_u: string;
  nivoa: number;
  zrna: number;
  poslednja_aktivnost: string | null;
};

export type PozivnicaOut = { polaznik: Polaznik; link: string; istice_u: string };

export type Osoblje = {
  id: number;
  ime: string;
  prezime: string;
  email: string | null;
  uloga: Uloga;
  aktivan: boolean;
  lokali: Lokal[];
  poslednja_prijava: string | null;
};

export type Verzija = {
  kurs: string;
  broj: number;
  objavljena: boolean;
  objavljena_u: string | null;
  napomena: string | null;
  nivoa: number;
  izazova: number;
};

export const NAZIV_ULOGE: Record<Uloga, string> = {
  admin: "Admin",
  trener: "Trener",
  menadzer: "Menadžer lokala",
  polaznik: "Polaznik",
};
