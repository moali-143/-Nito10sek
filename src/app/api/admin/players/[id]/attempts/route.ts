import { getAdminUser, jsonError } from "@/lib/api";
import { isSupabaseConfigured, getAdminSupabase } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return jsonError("Administrasjon er ikke konfigurert.", 503);
  try {
    if (!(await getAdminUser())) return jsonError("Du har ikke tilgang.", 403);
    const { id } = await context.params;
    if (!isUuid(id)) return jsonError("Ugyldig spiller.", 400);
    const attempts = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await getAdminSupabase()
        .from("attempts")
        .select("id,elapsed_ms,deviation_ms,absolute_deviation_ms,is_qualified,is_exact_hit,created_at")
        .eq("player_id", id)
        .order("created_at", { ascending: false })
        .range(offset, offset + 999);
      if (error) throw error;
      attempts.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return Response.json({ attempts }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Forsøkshistorikken kunne ikke hentes.", 503);
  }
}
