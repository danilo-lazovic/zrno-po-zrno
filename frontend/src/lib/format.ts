const DATUM_VREME = new Intl.DateTimeFormat("sr-Latn-RS", {
  timeZone: "Europe/Belgrade",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function datumVreme(iso: string | null): string {
  return iso ? DATUM_VREME.format(new Date(iso)) : "–";
}
