import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { enforceRateLimit, hasTrustedOrigin, InputError, isRecord, jsonError, readBoundedJson } from "@/lib/api";
import { isSupabaseConfigured, getAdminSupabase } from "@/lib/supabase/admin";
import { authCookieOptions } from "@/lib/supabase/cookies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return jsonError("Administrasjon er ikke konfigurert.", 503);
  }
  if (!hasTrustedOrigin(request)) return jsonError("Ugyldig forespørsel.", 403);

  try {
    if (!(await enforceRateLimit(request, "admin-login", 15, 600))) {
      return jsonError("For mange innloggingsforsøk. Vent litt og prøv igjen.", 429);
    }
    const body: unknown = await readBoundedJson(request, 4096);
    if (!isRecord(body) || typeof body.email !== "string" || typeof body.password !== "string") {
      return jsonError("Innloggingen mislyktes.", 400);
    }
    const email = body.email.trim();
    const password = body.password;
    if (!email || email.length > 254 || /[\p{Cc}\p{Cf}]/u.test(email) || !password || password.length > 256) {
      return jsonError("Innloggingen mislyktes.", 400);
    }

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: authCookieOptions,
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      },
    );
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.user) return jsonError("Innloggingen mislyktes. Kontroller opplysningene og prøv igjen.", 401);

    const { data: admin } = await getAdminSupabase()
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!admin) {
      await authClient.auth.signOut();
      return jsonError("Innloggingen mislyktes. Kontroller opplysningene og prøv igjen.", 401);
    }
    return Response.json({ signedIn: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InputError) return jsonError("Innloggingen mislyktes.", error.status);
    return jsonError("Innloggingen er midlertidig utilgjengelig.", 503);
  }
}
