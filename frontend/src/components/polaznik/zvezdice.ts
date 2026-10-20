import { icon } from "@/lib/art";

/** Red od tri zvezdice (artifact games.js starRow). */
export function zvezdice(n: number) {
  let h = `<span class="srow" aria-label="${n} od 3 zvezdice">`;
  for (let i = 0; i < 3; i++) h += `<span class="${i < n ? "on" : ""}">${icon("star")}</span>`;
  return h + "</span>";
}
