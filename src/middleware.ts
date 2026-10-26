import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions } from "@/lib/supabase/cookies";

function createContentSecurityPolicy(nonce: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseSources = "https://*.supabase.co wss://*.supabase.co";
  if (supabaseUrl) {
    try {
      const supabase = new URL(supabaseUrl);
      const socketProtocol = supabase.protocol === "https:" ? "wss:" : "ws:";
      supabaseSources = `${supabase.origin} ${socketProtocol}//${supabase.host}`;
    } catch {
      // An invalid Supabase URL will be reported by the API client; CSP remains restrictive.
    }
  }
  const development = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    development ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    `connect-src 'self' ${supabaseSources}${development ? " ws: wss:" : ""}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, contentSecurityPolicy: string) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function middleware(request: NextRequest) {
  const random = crypto.getRandomValues(new Uint8Array(18));
  const nonce = btoa(String.fromCharCode(...random));
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  let response = applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), contentSecurityPolicy);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) return response;

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), contentSecurityPolicy);
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
