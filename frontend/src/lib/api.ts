/** Nema veze sa serverom (telefon bez mreže, server ne odgovara): akcija može da čeka u redu za slanje. */
export class BezMreze extends Error {
  constructor() {
    super("Nema veze sa serverom.");
  }
}

/** Server je odbio zahtev; nosi HTTP status. */
export class GreskaServera extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Poziv backendu: istekla prijava vodi na prijavu, greška nosi poruku iz `detail`. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
    });
  } catch {
    throw new BezMreze();
  }
  // service worker vraća 503 kad nema mreže ni sačuvanog odgovora
  if (res.status === 503 && res.headers.get("x-zpz-offline")) throw new BezMreze();
  if (res.status === 401) {
    window.location.href = "/prijava";
    throw new Error("401");
  }
  if (!res.ok) {
    const telo = await res.json().catch(() => null);
    const detail = telo?.detail;
    // FastAPI validacija vraća listu grešaka
    throw new GreskaServera(typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg : `Greška ${res.status}`, res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const posalji = <T>(url: string, metod: "POST" | "PATCH", telo?: unknown) =>
  api<T>(url, { method: metod, body: telo === undefined ? undefined : JSON.stringify(telo) });
