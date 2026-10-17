import "server-only";
import { createSupabaseServerClient } from "./supabase-server";

/**
 * Saves the signed-in user's display name in their Supabase Auth metadata. The session
 * is refreshed so the new name is in the token that getCurrentUser reads. Call from a
 * server action, where the refreshed auth cookies can be written.
 */
export async function updateDisplayName(fullName: string): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (error) {
    console.error("[auth] display name update failed", error.code);
    return { ok: false };
  }
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) console.error("[auth] session refresh failed", refreshError.code);
  return { ok: true };
}
