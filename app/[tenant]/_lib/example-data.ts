import "server-only";
import { createPlaceholderUser, deletePlaceholderUser, isPlaceholderEmail } from "@/core/auth/admin";
import { addMember, listMembers, listRoles } from "@/core/tenancy";
import {
  countExampleCalls,
  createTask,
  EXAMPLE_REP_NAMES,
  loadExampleCalls,
  removeExampleCalls,
  setTaskStatus,
} from "@/modules/calls/server";
import { createPlay } from "@/modules/coaching/server";
import { stepCriteria } from "@/modules/scorecards";

// Example data a new company can load to see every page working: the 7 invented example calls,
// the 3 reps who made them (placeholder users who can't sign in), a few follow-ups and coaching
// plays. Nothing here runs AI. Everything is removed together, and only example data is touched.

/** A rep's placeholder address, unique per company so two companies' examples never collide. */
const repEmail = (name: string, tenantId: string) => `example-${name.toLowerCase()}-${tenantId.slice(0, 8)}@example.invalid`;

/** Example reps on the company's team (found by their placeholder address). */
async function exampleMembers(tenantId: string) {
  return (await listMembers(tenantId)).filter((m) => isPlaceholderEmail(m.email));
}

export async function exampleDataStatus(tenantId: string) {
  const [calls, reps] = await Promise.all([countExampleCalls(tenantId), exampleMembers(tenantId)]);
  return { calls, reps: reps.length, loaded: calls > 0 || reps.length > 0 };
}

/** Loads everything. `viewerId` is who's loading it: one follow-up is theirs, so they see the flow. */
export async function loadExampleData(tenantId: string, viewerId: string) {
  if ((await exampleDataStatus(tenantId)).loaded) return;

  // The reps join as Reps (the least access of the default roles).
  const roles = await listRoles(tenantId);
  const rep = roles.find((r) => r.name === "Rep") ?? [...roles].filter((r) => !r.isOwner).sort((a, b) => a.permissions.length - b.permissions.length)[0];
  if (!rep) throw new Error("This company has no role to give the example reps.");
  const ids: Record<string, string> = {};
  for (const name of EXAMPLE_REP_NAMES) {
    ids[name] = await createPlaceholderUser(repEmail(name, tenantId), name);
    await addMember(tenantId, ids[name], rep.id, name);
  }

  const calls = await loadExampleCalls(tenantId, ids);
  const callId = (part: string) => calls.find((c) => c.fileName.includes(part))?.id;

  // Follow-ups: one waiting on a rep, one for whoever loaded the data, one already done.
  const tasks = [
    { call: "mice quote", assignee: ids.Marcus, title: "Sale not closed: call back about the mice quote, they wanted to think it over", done: false },
    { call: "cancelling because moving", assignee: viewerId, title: "Customer cancelled: offer a first visit at their new address", done: false },
    { call: "declined card update", assignee: ids.Jordan, title: "Check the new card went through for next month's service", done: true },
  ];
  for (const t of tasks) {
    const id = callId(t.call);
    if (!id || !t.assignee) continue;
    const task = await createTask({ tenantId, callId: id, assigneeId: t.assignee, assignedBy: viewerId, title: t.title });
    if (t.done) await setTaskStatus(tenantId, task.id, "done");
  }

  // Coaching plays on each rep's most-missed step, worded like the ones the Team page suggests.
  const plays = [
    { rep: ids.Marcus, step: "Validate", criteria: stepCriteria("sales", "Validate", "Validate") },
    { rep: ids.Jordan, step: "Close", criteria: stepCriteria("sales", "Solve", "Close") },
  ];
  for (const p of plays) {
    if (p.rep) await createPlay({ tenantId, assigneeId: p.rep, assignedBy: viewerId, title: `Work on "${p.step}"`, detail: p.criteria });
  }
}

/** Removes the example calls and reps; their follow-ups and plays go with them. Real data stays. */
export async function removeExampleData(tenantId: string) {
  await removeExampleCalls(tenantId);
  for (const m of await exampleMembers(tenantId)) await deletePlaceholderUser(m.userId, m.email);
}

