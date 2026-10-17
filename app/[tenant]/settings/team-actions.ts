"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import {
  can,
  checkTenantAccess,
  createInvite,
  createRole,
  deleteRole,
  removeMember,
  revokeInvite,
  setMemberRole,
  TeamError,
  updateRole,
  type Permission,
  type TenantAccess,
} from "@/core/tenancy";

export type TeamResult = { ok: true; message?: string; inviteLink?: string } | { ok: false; error: string };

const SESSION_ENDED = "Your session ended. Log in again to make changes.";

/** Runs a team change if the member has `permission`, turning rule violations into messages. */
async function withPermission(
  slug: string,
  permission: Permission,
  run: (access: TenantAccess) => Promise<TeamResult>,
): Promise<TeamResult> {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { ok: false, error: SESSION_ENDED };
  if (!can(result.access, permission)) return { ok: false, error: "You don't have permission to do that." };
  try {
    const outcome = await run(result.access);
    refresh();
    return outcome;
  } catch (err) {
    if (err instanceof TeamError) return { ok: false, error: err.message };
    console.error("[team] change failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

async function inviteUrl(token: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/invite/${token}`;
}

const inviteInput = z.object({ email: z.email("Enter a valid email."), roleId: z.uuid("Choose a role.") });

export async function inviteMember(slug: string, email: string, roleId: string): Promise<TeamResult> {
  const parsed = inviteInput.safeParse({ email: email.trim(), roleId });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return withPermission(slug, "team.manage", async (access) => {
    const invite = await createInvite(
      access.tenant.id,
      { userId: access.user.id, role: access.role },
      parsed.data.email,
      parsed.data.roleId,
    );
    return { ok: true, message: `Invite created for ${invite.email}.`, inviteLink: await inviteUrl(invite.token) };
  });
}

export async function getInviteLink(token: string): Promise<string> {
  return inviteUrl(token);
}

export async function cancelInvite(slug: string, inviteId: string): Promise<TeamResult> {
  return withPermission(slug, "team.manage", async (access) => {
    await revokeInvite(access.tenant.id, inviteId);
    return { ok: true, message: "Invite cancelled." };
  });
}

export async function changeMemberRole(slug: string, userId: string, roleId: string): Promise<TeamResult> {
  return withPermission(slug, "team.manage", async (access) => {
    await setMemberRole(access.tenant.id, access.role, userId, roleId);
    return { ok: true, message: "Role updated." };
  });
}

export async function removeTeamMember(slug: string, userId: string): Promise<TeamResult> {
  return withPermission(slug, "team.manage", async (access) => {
    if (userId === access.user.id) throw new TeamError("You can't remove yourself.");
    await removeMember(access.tenant.id, access.role, userId);
    return { ok: true, message: "Member removed." };
  });
}

const roleInput = z.object({
  name: z.string().trim().min(2, "Give the role a name.").max(40, "Keep the name under 40 characters."),
  permissions: z.array(z.string()),
});

export async function saveRole(
  slug: string,
  roleId: string | null,
  name: string,
  permissions: string[],
): Promise<TeamResult> {
  const parsed = roleInput.safeParse({ name, permissions });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return withPermission(slug, "roles.manage", async (access) => {
    // Same rule as granting: you can't create or edit a role with more access than your own.
    const extra = parsed.data.permissions.filter((p) => !access.permissions.includes(p as Permission));
    if (extra.length > 0) throw new TeamError("A role can't have permissions you don't have yourself.");
    if (roleId) await updateRole(access.tenant.id, roleId, parsed.data.name, parsed.data.permissions);
    else await createRole(access.tenant.id, parsed.data.name, parsed.data.permissions);
    return { ok: true, message: roleId ? "Role saved." : `Role "${parsed.data.name}" created.` };
  });
}

export async function removeRole(slug: string, roleId: string): Promise<TeamResult> {
  return withPermission(slug, "roles.manage", async (access) => {
    await deleteRole(access.tenant.id, roleId);
    return { ok: true, message: "Role deleted." };
  });
}
