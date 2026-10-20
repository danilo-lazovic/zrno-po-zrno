import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { getMe, jeOsoblje } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/prijava");
  if (!jeOsoblje(me)) redirect("/");
  return (
    <div className="adm">
      <AdminNav me={me} />
      <main className="adm-main">{children}</main>
    </div>
  );
}
