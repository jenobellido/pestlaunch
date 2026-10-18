"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { checkTenantAccess } from "@/core/tenancy";
import { setupCookieName } from "./setup";

/** Hides the first-run checklist on this browser. It never comes back once every step is done anyway. */
export async function hideSetup(slug: string) {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return;
  (await cookies()).set(setupCookieName(result.access.tenant.id), "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
  refresh();
}
