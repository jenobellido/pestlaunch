"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { can, checkTenantAccess, listMembers } from "@/core/tenancy";
import { createTask, deleteTask, findTask, getCall, setTaskStatus } from "@/modules/calls/server";

export type TaskResult = { ok: true } | { ok: false; error: string };

const SESSION_ENDED = "Your session ended. Log in again.";

const assignInput = z.object({
  callId: z.uuid(),
  assigneeId: z.uuid(),
  title: z.string().trim().min(3).max(200),
});

/** Assigns a follow-up on a call to a team member. Needs "calls.assign". */
export async function assignTask(slug: string, callId: string, assigneeId: string, title: string): Promise<TaskResult> {
  const parsed = assignInput.safeParse({ callId, assigneeId, title });
  if (!parsed.success) return { ok: false, error: "Choose who should follow up." };
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { ok: false, error: SESSION_ENDED };
  const { access } = result;
  if (!can(access, "calls.assign")) return { ok: false, error: "You don't have permission to assign follow-ups." };
  if (!(await getCall(slug, parsed.data.callId))) return { ok: false, error: "That call doesn't exist." };
  if (!(await listMembers(access.tenant.id)).some((m) => m.userId === parsed.data.assigneeId)) {
    return { ok: false, error: "That person isn't on the team." };
  }
  await createTask({ tenantId: access.tenant.id, assignedBy: access.user.id, ...parsed.data });
  refresh();
  return { ok: true };
}

/** Marks a task done or reopens it. The assignee or anyone with "calls.assign" can. */
export async function setTaskDone(slug: string, taskId: string, done: boolean): Promise<TaskResult> {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { ok: false, error: SESSION_ENDED };
  const task = z.uuid().safeParse(taskId).success ? await findTask(result.access.tenant.id, taskId) : null;
  if (!task) return { ok: false, error: "That task doesn't exist." };
  if (task.assigneeId !== result.access.user.id && !can(result.access, "calls.assign")) {
    return { ok: false, error: "Only the person it's assigned to can update this task." };
  }
  await setTaskStatus(result.access.tenant.id, taskId, done ? "done" : "open");
  refresh();
  return { ok: true };
}

/** Removes a task. Needs "calls.assign". */
export async function removeTask(slug: string, taskId: string): Promise<TaskResult> {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { ok: false, error: SESSION_ENDED };
  if (!can(result.access, "calls.assign")) return { ok: false, error: "You don't have permission to remove tasks." };
  if (!z.uuid().safeParse(taskId).success) return { ok: false, error: "That task doesn't exist." };
  await deleteTask(result.access.tenant.id, taskId);
  refresh();
  return { ok: true };
}
