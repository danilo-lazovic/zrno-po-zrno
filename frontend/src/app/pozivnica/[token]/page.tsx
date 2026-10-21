import { AuthOkvir } from "@/components/AuthOkvir";
import { PostaviPin } from "@/components/PostaviPin";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8001";

type Info = { ime: string; korisnicko_ime: string; lokal: string | null; istice_u: string };

export default async function PozivnicaStrana({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await fetch(`${BACKEND_URL}/api/pozivnica/${encodeURIComponent(token)}`, { cache: "no-store" });
  const info: Info | null = res.ok ? await res.json() : null;
  const greska = info ? "" : ((await res.json().catch(() => null))?.detail ?? "Pozivnica ne važi.");

  return (
    <AuthOkvir>
      {info ? (
        <PostaviPin token={token} info={info} />
      ) : (
        <>
          <h1 className="h1">Link ne važi</h1>
          <p className="sub">{greska}</p>
          <a className="btn btn-gold btn-big" href="/prijava">
            Imam PIN, idem na prijavu
          </a>
        </>
      )}
    </AuthOkvir>
  );
}
