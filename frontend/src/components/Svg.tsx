import { icon } from "@/lib/art";

/** SVG iz art modula (naš statični markup, ne korisnički unos). */
export function Svg({ html, className }: { html: string; className?: string }) {
  return <span className={className} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Ikona({ ime }: { ime: string }) {
  return <Svg html={icon(ime)} />;
}
