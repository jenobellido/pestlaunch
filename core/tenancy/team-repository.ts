import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, eq, gt, ne, sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { db, schema } from "@/core/db";
import { ALL_PERMISSIONS, type Permission } from "./permissions";
import { canGrantRole } from "./rules";
import { toRole } from "./tenant-repository";
import type { Role } from "./types";

const { tenants, tenantMembers, tenantRoles, tenantInvites } = schema;

const INVITE_DAYS = 14;

/** A failed team change, with a message the UI can show as is. */
export class TeamError extends Error {}

export interface Member {
  userId: string;
  displayName: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: string;
}

async function ownerCount(tenantId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(tenantMembers)
    .innerJoin(tenantRoles, eq(tenantRoles.id, tenantMembers.roleId))
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantRoles.isOwner, true)));
  return row?.n ?? 0;
}

// ---- Roles ---------------------------------------------------------------------------

export async function listRoles(tenantId: string): Promise<(Role & { members: number })[]> {
  const rows = await db
    .select({ role: tenantRoles, members: count(tenantMembers.userId) })
    .from(tenantRoles)
    .leftJoin(tenantMembers, eq(tenantMembers.roleId, tenantRoles.id))
    .where(eq(tenantRoles.tenantId, tenantId))
    .groupBy(tenantRoles.id)
    .orderBy(sql`${tenantRoles.isOwner} desc`, asc(tenantRoles.createdAt));
  return rows.map((r) => ({ ...toRole(r.role), members: r.members }));
}

export async function getRole(tenantId: string, roleId: string): Promise<Role | null> {
  const [row] = await db
    .select()
    .from(tenantRoles)
    .where(and(eq(tenantRoles.tenantId, tenantId), eq(tenantRoles.id, roleId)))
    .limit(1);
  return row ? toRole(row) : null;
}

const cleanPermissions = (permissions: string[]) =>
  ALL_PERMISSIONS.filter((p) => permissions.includes(p)) as Permission[];

export async function createRole(tenantId: string, name: string, permissions: string[]): Promise<Role> {
  const [row] = await db
    .insert(tenantRoles)
    .values({ tenantId, name, permissions: cleanPermissions(permissions) })
    .onConflictDoNothing()
    .returning();
  if (!row) throw new TeamError(`There's already a role called "${name}".`);
  return toRole(row);
}

export async function updateRole(tenantId: string, roleId: string, name: string, permissions: string[]) {
  const role = await getRole(tenantId, roleId);
  if (!role) throw new TeamError("That role doesn't exist.");
  if (role.isOwner) throw new TeamError("The owner role always has every permission and can't be changed.");
  const [clash] = await db
    .select({ id: tenantRoles.id })
    .from(tenantRoles)
    .where(and(eq(tenantRoles.tenantId, tenantId), eq(tenantRoles.name, name), ne(tenantRoles.id, roleId)))
    .limit(1);
  if (clash) throw new TeamError(`There's already a role called "${name}".`);
  await db
    .update(tenantRoles)
    .set({ name, permissions: cleanPermissions(permissions) })
    .where(eq(tenantRoles.id, roleId));
}

export async function deleteRole(tenantId: string, roleId: string) {
  const role = await getRole(tenantId, roleId);
  if (!role) throw new TeamError("That role doesn't exist.");
  if (role.isOwner) throw new TeamError("The owner role can't be deleted.");
  const [inUse] = await db
    .select({ n: count() })
    .from(tenantMembers)
    .where(eq(tenantMembers.roleId, roleId));
  if (inUse.n > 0) throw new TeamError("Move this role's members to another role before deleting it.");
  await db.delete(tenantRoles).where(eq(tenantRoles.id, roleId));
}

// ---- Members -------------------------------------------------------------------------

export async function listMembers(tenantId: string): Promise<Member[]> {
  const rows = await db
    .select({ member: tenantMembers, role: tenantRoles, email: authUsers.email })
    .from(tenantMembers)
    .innerJoin(tenantRoles, eq(tenantRoles.id, tenantMembers.roleId))
    .innerJoin(authUsers, eq(authUsers.id, tenantMembers.userId))
    .where(eq(tenantMembers.tenantId, tenantId))
    .orderBy(asc(tenantMembers.createdAt));
  return rows.map(({ member, role, email }) => ({
    userId: member.userId,
    email: email ?? "",
    displayName: member.displayName || email?.split("@")[0] || "Team member",
    role: toRole(role),
    joinedAt: member.createdAt.toISOString(),
  }));
}

export async function setMemberRole(tenantId: string, actor: Role, userId: string, roleId: string) {
  const role = await getRole(tenantId, roleId);
  if (!role) throw new TeamError("That role doesn't exist.");
  const current = (await listMembers(tenantId)).find((m) => m.userId === userId);
  if (!current) throw new TeamError("That person isn't on the team.");
  if (!canGrantRole(actor, role) || !canGrantRole(actor, current.role)) {
    throw new TeamError("You can only give or change roles that have no more access than your own.");
  }
  if (current.role.isOwner && !role.isOwner && (await ownerCount(tenantId)) <= 1) {
    throw new TeamError("Every company needs at least one owner. Make someone else an owner first.");
  }
  await db
    .update(tenantMembers)
    .set({ roleId })
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)));
}

export async function removeMember(tenantId: string, actor: Role, userId: string) {
  const current = (await listMembers(tenantId)).find((m) => m.userId === userId);
  if (!current) throw new TeamError("That person isn't on the team.");
  if (!canGrantRole(actor, current.role)) throw new TeamError("You can't remove someone with more access than you.");
  if (current.role.isOwner && (await ownerCount(tenantId)) <= 1) {
    throw new TeamError("Every company needs at least one owner.");
  }
  await db.delete(tenantMembers).where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)));
}

/** Adds someone to the company with a role (used for example data; people normally join by invite). */
export async function addMember(tenantId: string, userId: string, roleId: string, displayName: string) {
  await db.insert(tenantMembers).values({ tenantId, userId, roleId, displayName }).onConflictDoNothing();
}

/** Keeps the name shown on calls and coaching in step with the user's profile. */
export async function updateMemberDisplayName(userId: string, displayName: string) {
  await db.update(tenantMembers).set({ displayName }).where(eq(tenantMembers.userId, userId));
}

// ---- Invites -------------------------------------------------------------------------

export async function listInvites(tenantId: string): Promise<Invite[]> {
  const rows = await db
    .select({ invite: tenantInvites, role: tenantRoles })
    .from(tenantInvites)
    .innerJoin(tenantRoles, eq(tenantRoles.id, tenantInvites.roleId))
    .where(and(eq(tenantInvites.tenantId, tenantId), gt(tenantInvites.expiresAt, new Date())))
    .orderBy(asc(tenantInvites.createdAt));
  return rows.map(({ invite, role }) => ({
    id: invite.id,
    email: invite.email,
    role: toRole(role),
    token: invite.token,
    expiresAt: invite.expiresAt.toISOString(),
  }));
}

export async function createInvite(tenantId: string, actor: { userId: string; role: Role }, email: string, roleId: string) {
  const role = await getRole(tenantId, roleId);
  if (!role) throw new TeamError("That role doesn't exist.");
  if (!canGrantRole(actor.role, role)) throw new TeamError("You can only invite people to roles with no more access than your own.");

  const normalized = email.trim().toLowerCase();
  const alreadyMember = (await listMembers(tenantId)).some((m) => m.email.toLowerCase() === normalized);
  if (alreadyMember) throw new TeamError("That person is already on the team.");

  // One open invite per email: a new one replaces the old.
  await db.delete(tenantInvites).where(and(eq(tenantInvites.tenantId, tenantId), eq(tenantInvites.email, normalized)));
  const [invite] = await db
    .insert(tenantInvites)
    .values({
      tenantId,
      email: normalized,
      roleId,
      token: randomBytes(24).toString("base64url"),
      invitedBy: actor.userId,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    })
    .returning();
  return invite;
}

export async function revokeInvite(tenantId: string, inviteId: string) {
  await db.delete(tenantInvites).where(and(eq(tenantInvites.tenantId, tenantId), eq(tenantInvites.id, inviteId)));
}

/** The invite behind a link, with the company and role names to show on the accept page. */
export async function getInviteByToken(token: string) {
  const [row] = await db
    .select({ invite: tenantInvites, tenant: tenants, role: tenantRoles })
    .from(tenantInvites)
    .innerJoin(tenants, eq(tenants.id, tenantInvites.tenantId))
    .innerJoin(tenantRoles, eq(tenantRoles.id, tenantInvites.roleId))
    .where(and(eq(tenantInvites.token, token), gt(tenantInvites.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  return {
    id: row.invite.id,
    email: row.invite.email,
    tenant: { id: row.tenant.id, slug: row.tenant.slug, name: row.tenant.name },
    role: toRole(row.role),
  };
}

/**
 * Joins the tenant with the invite's role. Only the account the invite was sent to can use
 * it, so a forwarded link doesn't let someone else in.
 */
export async function acceptInvite(token: string, user: { id: string; email: string; name: string | null }) {
  const invite = await getInviteByToken(token);
  if (!invite) throw new TeamError("This invite has expired or was cancelled. Ask for a new one.");
  if (invite.email !== user.email.toLowerCase()) {
    throw new TeamError(`This invite is for ${invite.email}. Log in with that email to accept it.`);
  }
  await db.transaction(async (tx) => {
    await tx
      .insert(tenantMembers)
      .values({
        tenantId: invite.tenant.id,
        userId: user.id,
        roleId: invite.role.id,
        displayName: user.name || user.email.split("@")[0],
      })
      .onConflictDoNothing();
    await tx.delete(tenantInvites).where(eq(tenantInvites.id, invite.id));
  });
  return invite.tenant;
}
