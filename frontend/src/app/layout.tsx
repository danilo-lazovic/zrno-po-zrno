import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./zrno.css";
import "./osnova.css";

// Kafeterija design system: isti fontovi kao portal; next/font ih služi sa našeg domena, pa rade i bez mreže
const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zrno po zrno",
  description: "Obuka barista Kafeterije: lekcije, igre i završni test.",
  applicationName: "Zrno po zrno",
  // iPhone: sa početnog ekrana se otvara preko celog ekrana
  appleWebApp: { capable: true, title: "Zrno po zrno", statusBarStyle: "default" },
  icons: { apple: "/ikone/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5d8e7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn" className={`${bricolage.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
