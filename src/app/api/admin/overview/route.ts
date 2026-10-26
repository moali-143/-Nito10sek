import { isSupabaseConfigured, getAdminSupabase } from "@/lib/supabase/admin";
import { countRows, getAdminUser, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return jsonError("Administrasjon er ikke konfigurert.", 503);
  try {
    const user = await getAdminUser();
    if (!user) return jsonError("Du har ikke tilgang.", 403);
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 24).replace(/[%,_]/g, "");
    const filter = url.searchParams.get("filter") ?? "all";
    const sort = url.searchParams.get("sort") ?? "rank";
    const client = getAdminSupabase();
    const [players, attempts, qualifiedAttempts, qualifiedPlayers] = await Promise.all([
      countRows(client, "players"),
      countRows(client, "attempts"),
      countRows(client, "attempts", true),
      client.from("public_leaderboard").select("player_id", { count: "exact", head: true }).eq("is_qualified", true),
    ]);
    if (players.error || attempts.error || qualifiedAttempts.error || qualifiedPlayers.error) throw new Error("Could not load statistics");
    const results = [];
    for (let offset = 0; ; offset += 1000) {
      let resultQuery = client
        .from("public_leaderboard")
        .select("placement,player_id,nickname,attempt_id,elapsed_ms,deviation_ms,absolute_deviation_ms,is_qualified,is_exact_hit,created_at,attempt_count,first_qualified_at");
      if (filter === "qualified") resultQuery = resultQuery.eq("is_qualified", true);
      if (filter === "not_qualified") resultQuery = resultQuery.eq("is_qualified", false);
      if (query) resultQuery = resultQuery.ilike("nickname", `%${query}%`);
      if (sort === "time") resultQuery = resultQuery.order("absolute_deviation_ms", { ascending: true }).order("created_at", { ascending: true });
      else if (sort === "date") resultQuery = resultQuery.order("created_at", { ascending: false });
      else resultQuery = resultQuery.order("placement", { ascending: true });
      const { data, error } = await resultQuery.range(offset, offset + 999);
      if (error) throw error;
      results.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return Response.json({
      stats: {
        players: players.count ?? 0,
        attempts: attempts.count ?? 0,
        qualifiedAttempts: qualifiedAttempts.count ?? 0,
        qualifiedPlayers: qualifiedPlayers.count ?? 0,
      },
      results,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError("Kunne ikke hente administrasjonsdata.", 503);
  }
}
