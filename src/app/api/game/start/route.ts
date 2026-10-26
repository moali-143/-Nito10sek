import { isSupabaseConfigured, getAdminSupabase } from "@/lib/supabase/admin";
import { enforceRateLimit, InputError, isRecord, jsonError, readBoundedJson } from "@/lib/api";
import { isUuid, signGameToken } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ available: false, configured: false });
  try {
    // Allow retries and concurrent participants behind the stand's shared IP.
    if (!(await enforceRateLimit(request, "start", 600, 600))) return jsonError("For mange forsøk. Vent litt.", 429);
    const body: unknown = await readBoundedJson(request);
    if (!isRecord(body) || !isUuid(body.playerId)) return jsonError("Ugyldig forespørsel.", 400);
    const { data, error } = await getAdminSupabase()
      .from("game_sessions")
      .insert({ player_id: body.playerId })
      .select("id")
      .single();
    if (error || !data) throw new Error("Session creation failed");
    return Response.json({ token: signGameToken(data.id, body.playerId) });
  } catch (error) {
    if (error instanceof InputError) return jsonError("Ugyldig forespørsel.", error.status);
    return jsonError("Kunne ikke starte et registrerbart forsøk.", 503);
  }
}
