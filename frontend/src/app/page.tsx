import { redirect } from "next/navigation";
import { Polaznik } from "@/components/polaznik/Polaznik";
import { getMe, jeOsoblje } from "@/lib/session";

export default async function Pocetna() {
  const me = await getMe();
  if (!me) redirect("/prijava");
  if (jeOsoblje(me)) redirect("/admin");
  return <Polaznik me={me} />;
}
