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
    background_color: "#F6F1EC",
    theme_color: "#F6F1EC",
    icons: [
      { src: "/ikone/ikona-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ikone/ikona-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/ikone/ikona-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
