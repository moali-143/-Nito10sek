import Image from "next/image";
import LoginForm from "@/components/admin-login";

export default function AdminLoginPage() {
  return (
    <main className="admin-shell">
      <div className="login-card">
        <Image className="admin-logo" src="/nito-logo-primary-deep.png" alt="NITO" width={4000} height={1828} priority />
        <h1>Administrasjon</h1>
        <p className="admin-subtitle">Logg inn med den administratorbrukeren som er satt opp i Supabase.</p>
        <LoginForm />
      </div>
    </main>
  );
}
