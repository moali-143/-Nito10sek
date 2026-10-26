import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasTrustedOrigin, jsonError } from "@/lib/api";
import { authCookieOptions } from "@/lib/supabase/cookies";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return jsonError("Ugyldig forespørsel.", 403);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieStore = await cookies();
  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    });
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(new URL("/admin/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
