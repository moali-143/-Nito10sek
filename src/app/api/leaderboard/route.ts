import { isSupabaseConfigured, getAdminSupabase } from "@/lib/supabase/admin";
import { enforceRateLimit, jsonError } from "@/lib/api";
import { MAX_PUBLIC_LEADERBOARD_ENTRIES, type AttemptView } from "@/lib/challenge";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ configured: false, qualified: [], notQualified: [] });
  try {
    // Several stand devices may refresh the live board from the same IP.
    if (!(await enforceRateLimit(request, "leaderboard", 600, 60))) return jsonError("For mange forespørsler. Vent litt.", 429);
    const client = getAdminSupabase();
    const fields = "placement,player_id,nickname,attempt_id,elapsed_ms,deviation_ms,absolute_deviation_ms,is_qualified,is_exact_hit,created_at,attempt_count,first_qualified_at";
    const qualifiedPage = await client.from("public_leaderboard")
      .select(fields)
      .eq("is_qualified", true)
      .order("placement", { ascending: true })
      .range(0, MAX_PUBLIC_LEADERBOARD_ENTRIES - 1);
    if (qualifiedPage.error) throw new Error("Leaderboard query failed");
    const qualified = (qualifiedPage.data ?? []) as AttemptView[];

    const remaining = MAX_PUBLIC_LEADERBOARD_ENTRIES - qualified.length;
    let notQualified: AttemptView[] = [];
    if (remaining > 0) {
      const notQualifiedPage = await client.from("public_leaderboard")
        .select(fields)
        .eq("is_qualified", false)
        .order("placement", { ascending: true })
        .range(0, remaining - 1);
      if (notQualifiedPage.error) throw new Error("Leaderboard query failed");
      notQualified = (notQualifiedPage.data ?? []) as AttemptView[];
    }
    return Response.json({
      configured: true,
      qualified,
      notQualified,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Topplisten er midlertidig utilgjengelig.", 503);
  }
}
