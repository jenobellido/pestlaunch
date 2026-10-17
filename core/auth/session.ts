import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createSupabaseServerClient } from "./supabase-server";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
}

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Auth must be checked per request: token verification reads the clock and
  // the result must never end up in a prerendered or prefetched shell.
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return {
    id: claims.sub,
    email: claims.email ?? "",
    name: (claims.user_metadata?.full_name as string | undefined) ?? null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
