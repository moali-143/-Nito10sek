import { isSupabaseConfigured, getAdminSupabase } from "@/lib/supabase/admin";
import { enforceRateLimit, InputError, isRecord, jsonError, readBoundedJson } from "@/lib/api";
import { isUuid } from "@/lib/security";
import { normalizeNickname } from "@/lib/challenge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ ready: false, configured: false });
  try {
    // A busy NITO stand shares one public IP, so allow normal event traffic.
    if (!(await enforceRateLimit(request, "prepare", 300, 600))) return jsonError("For mange forespørsler. Vent litt og prøv igjen.", 429);
    const body: unknown = await readBoundedJson(request);
    if (!isRecord(body)) return jsonError("Ugyldig forespørsel.", 400);
    const playerId = body.playerId;
    const nickname = normalizeNickname(body.nickname);
    if (!isUuid(playerId) || !nickname) return jsonError("Sjekk kallenavnet og prøv igjen.", 400);

    const { error } = await getAdminSupabase()
      .from("players")
      .upsert({ id: playerId, nickname, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
    const { data: best, error: bestError } = await getAdminSupabase()
      .from("public_leaderboard")
      .select("placement,elapsed_ms,deviation_ms,is_qualified,attempt_count")
      .eq("player_id", playerId)
      .maybeSingle();
    if (bestError) throw bestError;
    return Response.json({ ready: true, playerId, personalBest: best ?? null });
  } catch (error) {
    if (error instanceof InputError) return jsonError("Ugyldig forespørsel.", error.status);
    return jsonError("Kunne ikke klargjøre forsøket akkurat nå.", 503);
  }
}
