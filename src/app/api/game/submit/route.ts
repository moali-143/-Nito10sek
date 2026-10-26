import { isSupabaseConfigured, getAdminSupabase } from "@/lib/supabase/admin";
import { enforceRateLimit, InputError, isRecord, jsonError, readBoundedJson } from "@/lib/api";
import { toStoredMilliseconds } from "@/lib/challenge";
import { verifyGameToken } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return jsonError("Resultatet kan ikke lagres før databasen er konfigurert.", 503);
  try {
    // Participants at one event share an IP; retain a generous abuse limit.
    if (!(await enforceRateLimit(request, "submit", 300, 600))) return jsonError("For mange forsøk. Vent litt.", 429);
    const body: unknown = await readBoundedJson(request);
    if (!isRecord(body)) return jsonError("Ugyldig forespørsel.", 400);
    const session = verifyGameToken(body.token);
    const elapsedMs = toStoredMilliseconds(body.elapsedMs);
    if (!session || !elapsedMs) return jsonError("Forsøket kunne ikke godkjennes.", 400);

    const { data, error } = await getAdminSupabase().rpc("submit_attempt", {
      p_session_id: session.sessionId,
      p_player_id: session.playerId,
      p_elapsed_ms: elapsedMs,
    });
    if (error || !Array.isArray(data) || !data[0]) return jsonError("Forsøket kunne ikke godkjennes.", 400);
    const attempt = data[0] as {
      attempt_id: string;
      elapsed_ms: string;
      deviation_ms: string;
      absolute_deviation_ms: string;
      is_qualified: boolean;
      is_exact_hit: boolean;
      created_at: string;
    };
    const { data: best, error: bestError } = await getAdminSupabase()
      .from("public_leaderboard")
      .select("placement,elapsed_ms,deviation_ms,is_qualified,attempt_count")
      .eq("player_id", session.playerId)
      .single();
    if (bestError || !best) throw new Error("Could not load personal result");
    return Response.json({
      attemptId: attempt.attempt_id,
      elapsedMs: attempt.elapsed_ms,
      deviationMs: attempt.deviation_ms,
      absoluteDeviationMs: attempt.absolute_deviation_ms,
      isQualified: attempt.is_qualified,
      isExactHit: attempt.is_exact_hit,
      createdAt: attempt.created_at,
      personalBest: best,
    });
  } catch (error) {
    if (error instanceof InputError) return jsonError("Ugyldig forespørsel.", error.status);
    return jsonError("Resultatet kunne ikke lagres akkurat nå.", 503);
  }
}
