import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { rateLimitKey } from "@/lib/security";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export class InputError extends Error {
  constructor(readonly status: number) {
    super("Invalid request body");
  }
}

export async function readBoundedJson(request: Request, maxBytes = 2048): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new InputError(413);
  if (!request.body) throw new InputError(400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new InputError(413);
    }
    chunks.push(value);
  }

  const input = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    input.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(input)) as unknown;
  } catch {
    throw new InputError(400);
  }
}

export function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expectedOrigin = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
      : new URL(request.url).origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export async function enforceRateLimit(request: Request, action: string, limit: number, windowSeconds: number) {
  const client = getAdminSupabase();
  const key = `${action}:${rateLimitKey(request)}`;
  const { data, error } = await client.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Rate limit check failed");
  return data === true;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getAdminUser() {
  const { getSupabaseServerClient } = await import("@/lib/supabase/server");
  const authClient = await getSupabaseServerClient();
  if (!authClient) return null;
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;
  const { data: admin, error: adminError } = await getAdminSupabase()
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError || !admin) return null;
  return user;
}

export function countRows(client: SupabaseClient, table: string, qualifiedOnly = false) {
  let query = client.from(table).select("id", { count: "exact", head: true });
  if (qualifiedOnly) query = query.eq("is_qualified", true);
  return query;
}
