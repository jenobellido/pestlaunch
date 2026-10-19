"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { can, checkTenantAccess, listMembers } from "@/core/tenancy";
import { createPlay, deletePlay, findPlay, setPlayStatus } from "@/modules/coaching/server";

export type PlayResult = { ok: true } | { ok: false; error: string };

const SESSION_ENDED = "Your session ended. Log in again.";

/** Managing someone else's coaching needs "coaching.manage" and seeing their calls. */
const coachesOthers = (access: Parameters<typeof can>[0]) => can(access, "coaching.manage") && can(access, "calls.view_all");

const assignInput = z.object({
  assigneeId: z.uuid(),
  title: z.string().trim().min(3).max(120),
  detail: z.string().trim().max(500).nullable(),
});

/** Assigns a coaching play to a team member. Needs "coaching.manage". */
export async function assignPlay(
  slug: string,
  assigneeId: string,
  title: string,
  detail: string | null,
): Promise<PlayResult> {
  const parsed = assignInput.safeParse({ assigneeId, title, detail });
  if (!parsed.success) return { ok: false, error: "Give the focus a short title (3 to 120 characters)." };
  const access = await checkTenantAccess(slug);
  if (!access.ok) return { ok: false, error: SESSION_ENDED };
  // Coaching someone means seeing their calls: assigning needs both.
  const self = parsed.data.assigneeId === access.access.user.id;
  if (!can(access.access, "coaching.manage") || (!self && !can(access.access, "calls.view_all"))) {
    return { ok: false, error: "You don't have permission to assign coaching." };
  }
  const { tenant, user } = access.access;
  if (!(await listMembers(tenant.id)).some((m) => m.userId === parsed.data.assigneeId)) {
    return { ok: false, error: "That person isn't on the team." };
  }
  await createPlay({ tenantId: tenant.id, assignedBy: user.id, ...parsed.data });
  refresh();
  return { ok: true };
}

/** Marks a play done or reopens it. The assignee or anyone with "coaching.manage" can. */
export async function setPlayDone(slug: string, playId: string, done: boolean): Promise<PlayResult> {
  const access = await checkTenantAccess(slug);
  if (!access.ok) return { ok: false, error: SESSION_ENDED };
  const play = z.uuid().safeParse(playId).success ? await findPlay(access.access.tenant.id, playId) : null;
  if (!play) return { ok: false, error: "That coaching focus doesn't exist." };
  if (play.assigneeId !== access.access.user.id && !coachesOthers(access.access)) {
    return { ok: false, error: "Only the person it's assigned to can update this." };
  }
  await setPlayStatus(access.access.tenant.id, playId, done ? "done" : "open");
  refresh();
  return { ok: true };
}

/** Removes a play. Needs "coaching.manage". */
export async function removePlay(slug: string, playId: string): Promise<PlayResult> {
  const access = await checkTenantAccess(slug);
  if (!access.ok) return { ok: false, error: SESSION_ENDED };
  if (!coachesOthers(access.access)) return { ok: false, error: "You don't have permission to remove coaching." };
  if (!z.uuid().safeParse(playId).success) return { ok: false, error: "That coaching focus doesn't exist." };
  await deletePlay(access.access.tenant.id, playId);
  refresh();
  return { ok: true };
}
