import { isSupabaseConfigured, getAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  if (!isSupabaseConfigured()) return jsonError("Administrasjon er ikke konfigurert.", 503);
  try {
    if (!(await getAdminUser())) return jsonError("Du har ikke tilgang.", 403);
    const data = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: page, error } = await getAdminSupabase()
        .from("public_leaderboard")
        .select("placement,nickname,elapsed_ms,deviation_ms,absolute_deviation_ms,is_qualified,is_exact_hit,attempt_count,created_at,first_qualified_at,player_id")
        .order("placement", { ascending: true })
        .range(offset, offset + 999);
      if (error) throw error;
      data.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    const rows = [
      ["Plassering", "Kallenavn", "Beste tid (ms)", "Signert avvik (ms)", "Absolutt avvik (ms)", "Kvalifisert", "Eksakt 10,000", "Antall forsøk", "Tidspunkt for beste forsøk", "Første kvalifisering", "Spiller-ID"],
      ...data.map((row) => [row.placement, row.nickname, row.elapsed_ms, row.deviation_ms, row.absolute_deviation_ms, row.is_qualified ? "Ja" : "Nei", row.is_exact_hit ? "Ja" : "Nei", row.attempt_count, row.created_at, row.first_qualified_at ?? "", row.player_id]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="nito-10-seconds-results.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return jsonError("Kunne ikke lage CSV-eksporten.", 503);
  }
}
