import Image from "next/image";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authClient = await getSupabaseServerClient();
  if (!authClient) {
    return (
      <main className="admin-shell"><div className="login-card">
        <Image className="admin-logo" src="/nito-logo-primary-deep.png" alt="NITO" width={4000} height={1828} />
        <h1>Administrasjon er ikke konfigurert</h1>
        <p className="admin-subtitle">Sett opp Supabase-miljøvariablene før du logger inn.</p>
      </div></main>
    );
  }
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect("/admin/login");
  if (!isSupabaseConfigured()) {
    return <main className="admin-shell"><div className="login-card"><h1>Database mangler</h1><p>Administrasjon er ikke tilgjengelig før Supabase er konfigurert.</p></div></main>;
  }
  const { data: admin, error } = await getAdminSupabase().from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !admin) {
    return (
      <main className="admin-shell"><div className="login-card">
        <Image className="admin-logo" src="/nito-logo-primary-deep.png" alt="NITO" width={4000} height={1828} />
        <h1>Ingen administratortilgang</h1>
        <p className="admin-subtitle">Kontoen er innlogget, men er ikke registrert som administrator.</p>
        <form action="/api/admin/logout" method="post"><button className="admin-action secondary" type="submit">Logg ut</button></form>
      </div></main>
    );
  }
  return <AdminDashboard email={user.email ?? "Administrator"} />;
}
