/** Poziv backendu: istekla prijava vodi na prijavu, greška nosi poruku iz `detail`. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
  });
  if (res.status === 401) {
    window.location.href = "/prijava";
    throw new Error("401");
  }
  if (!res.ok) {
    const telo = await res.json().catch(() => null);
    const detail = telo?.detail;
    // FastAPI validacija vraća listu grešaka
    throw new Error(typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg : `Greška ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const posalji = <T>(url: string, metod: "POST" | "PATCH", telo?: unknown) =>
  api<T>(url, { method: metod, body: telo === undefined ? undefined : JSON.stringify(telo) });
