import { redirect } from "next/navigation";
import { Prijava } from "@/components/Prijava";
import { getMe, jeOsoblje } from "@/lib/session";

export default async function PrijavaStrana() {
  const me = await getMe();
  if (me) redirect(jeOsoblje(me) ? "/admin" : "/");
  return <Prijava />;
}
