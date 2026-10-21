import { redirect } from "next/navigation";
import { Uredjivac } from "@/components/admin/uredjivac/Uredjivac";
import { getMe } from "@/lib/session";

export default async function UrediStrana() {
  const me = await getMe();
  if (!me || !["admin", "trener"].includes(me.korisnik.uloga)) redirect("/admin");
  return <Uredjivac />;
}
