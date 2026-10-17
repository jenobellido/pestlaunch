"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/core/auth";
import { acceptInvite, TeamError } from "@/core/tenancy";

export async function acceptInviteAction(token: string, _prev: { error?: string }): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/invite/${token}`);
  let slug: string;
  try {
    slug = (await acceptInvite(token, user)).slug;
  } catch (err) {
    return { error: err instanceof TeamError ? err.message : "Could not join the company. Try again." };
  }
  redirect(`/${slug}`);
}
