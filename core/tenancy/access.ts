import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser, type CurrentUser } from "@/core/auth";
import { getMemberRole, getTenantBySlug } from "./tenant-repository";
import type { MemberRole, Tenant } from "./types";

export interface TenantAccess {
  tenant: Tenant;
  user: CurrentUser;
  role: MemberRole;
}

export type TenantAccessResult =
  | { ok: true; access: TenantAccess }
  | { ok: false; reason: "unauthenticated" | "not_found" };

/**
 * Resolves whether the current user may access a tenant. Unknown tenants and
 * tenants the user isn't a member of look the same, so slugs can't be probed.
 */
export const checkTenantAccess = cache(async (slug: string): Promise<TenantAccessResult> => {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const tenant = await getTenantBySlug(slug);
  const role = tenant && (await getMemberRole(tenant.id, user.id));
  if (!tenant || !role) return { ok: false, reason: "not_found" };

  return { ok: true, access: { tenant, user, role } };
});

/** For pages: redirects to login or 404s when the user can't access the tenant. */
export async function requireTenantAccess(slug: string): Promise<TenantAccess> {
  const result = await checkTenantAccess(slug);
  if (result.ok) return result.access;
  if (result.reason === "unauthenticated") redirect("/login");
  notFound();
}
