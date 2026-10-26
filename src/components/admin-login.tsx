"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setBusy(false);
      if (!response.ok) throw new Error("Login failed");
    } catch {
      setBusy(false);
      setMessage("Innloggingen mislyktes. Kontroller opplysningene og prøv igjen.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <label className="login-field">E-post<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="login-field">Passord<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {message && <p className="login-message" role="alert">{message}</p>}
      <button className="admin-action" type="submit" disabled={busy}>{busy ? "Logger inn …" : "Logg inn"}</button>
    </form>
  );
}
