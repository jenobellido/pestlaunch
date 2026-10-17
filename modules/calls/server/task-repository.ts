import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/core/db";
import { callTasks, calls } from "./schema";

const { tenantMembers } = schema;

export interface CallTask {
  id: string;
  callId: string;
  callTitle: string;
  assigneeId: string;
  assigneeName: string;
  title: string;
  status: "open" | "done";
  createdAt: string;
}

/** A tenant's tasks, open first then newest; only one member's when `assigneeId` is given. */
export async function listTasks(tenantId: string, scope: { assigneeId?: string; callId?: string } = {}): Promise<CallTask[]> {
  const rows = await db
    .select({ task: callTasks, callFile: calls.fileName, name: tenantMembers.displayName })
    .from(callTasks)
    .innerJoin(calls, eq(calls.id, callTasks.callId))
    .leftJoin(tenantMembers, and(eq(tenantMembers.tenantId, callTasks.tenantId), eq(tenantMembers.userId, callTasks.assigneeId)))
    .where(
      and(
        eq(callTasks.tenantId, tenantId),
        scope.assigneeId ? eq(callTasks.assigneeId, scope.assigneeId) : undefined,
        scope.callId ? eq(callTasks.callId, scope.callId) : undefined,
      ),
    )
    .orderBy(desc(callTasks.createdAt));
  return rows
    .map(({ task, callFile, name }) => ({
      id: task.id,
      callId: task.callId,
      callTitle: callFile.replace(/\.[^.]+$/, ""),
      assigneeId: task.assigneeId,
      assigneeName: name ?? "Former member",
      title: task.title,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
    }))
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
}

export async function createTask(values: {
  tenantId: string;
  callId: string;
  assigneeId: string;
  assignedBy: string;
  title: string;
}) {
  const [task] = await db.insert(callTasks).values(values).returning();
  return task;
}

export async function findTask(tenantId: string, taskId: string) {
  const [task] = await db
    .select()
    .from(callTasks)
    .where(and(eq(callTasks.tenantId, tenantId), eq(callTasks.id, taskId)))
    .limit(1);
  return task ?? null;
}

export async function setTaskStatus(tenantId: string, taskId: string, status: "open" | "done") {
  await db
    .update(callTasks)
    .set({ status, completedAt: status === "done" ? new Date() : null })
    .where(and(eq(callTasks.tenantId, tenantId), eq(callTasks.id, taskId)));
}

export async function deleteTask(tenantId: string, taskId: string) {
  await db.delete(callTasks).where(and(eq(callTasks.tenantId, tenantId), eq(callTasks.id, taskId)));
}
