import type { Metadata, Viewport } from "next";
import "./zrno.css";
import "./osnova.css";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1EC" },
    { media: "(prefers-color-scheme: dark)", color: "#160E0A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Martian+Mono:wght@400;600&family=Onest:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
