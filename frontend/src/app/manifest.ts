import type { MetadataRoute } from "next";

/** Instalacija na telefon (Modul 6): otvara se kao aplikacija, bez trake pregledača. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Zrno po zrno",
    short_name: "Zrno po zrno",
    description: "Obuka barista Kafeterije: lekcije, igre i završni test.",
    lang: "sr-Latn",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f0e1",
    theme_color: "#f5d8e7",
    icons: [
      { src: "/ikone/ikona-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ikone/ikona-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/ikone/ikona-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
