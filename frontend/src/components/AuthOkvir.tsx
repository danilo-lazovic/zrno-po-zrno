/** Prijava i pozivnica kao prijava u portalu: roze panel sa logom Kafeterije, sadržaj na krem podlozi. */
export function AuthOkvir({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-okvir">
      <aside className="auth-brend">
        <span className="label">Obuka barista</span>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kafeterija-banner.png" alt="Kafeterija" width={1400} height={336} />
          <p className="auth-slogan">Zrno po zrno: od trešnje do šoljice, nivo po nivo.</p>
        </div>
        <figure className="lik auth-lik">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/lik-devojka.png" alt="" width={699} height={960} />
          <figcaption className="lik-balon">Ajde za šank!</figcaption>
        </figure>
        <ul className="pill-red">
          {["Lekcije", "Igre", "Završni test", "Sertifikat"].map((x) => (
            <li key={x} className="znak">
              {x}
            </li>
          ))}
        </ul>
      </aside>
      <main className="auth">{children}</main>
    </div>
  );
}
