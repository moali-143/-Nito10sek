import { isSupabaseConfigured, getAdminSupabase } from "@/lib/supabase/admin";
import { getAdminUser, hasTrustedOrigin, jsonError } from "@/lib/api";
import { isUuid } from "@/lib/security";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return jsonError("Administrasjon er ikke konfigurert.", 503);
  try {
    if (!(await getAdminUser())) return jsonError("Du har ikke tilgang.", 403);
    if (!hasTrustedOrigin(_request)) return jsonError("Ugyldig forespørsel.", 403);
    const { id } = await context.params;
    if (!isUuid(id)) return jsonError("Ugyldig spiller.", 400);
    const { error } = await getAdminSupabase().from("players").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ deleted: true });
  } catch {
    return jsonError("Spilleren kunne ikke slettes.", 503);
  }
}
