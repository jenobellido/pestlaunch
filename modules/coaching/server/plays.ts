import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/core/db";
import { coachingPlays } from "./schema";

const { tenantMembers } = schema;

export interface Play {
  id: string;
  assigneeId: string;
  assigneeName: string;
  title: string;
  detail: string | null;
  status: "open" | "done";
  createdAt: string;
  completedAt: string | null;
}

/** A tenant's plays, newest first; only the assignee's own when `assigneeId` is given. */
export async function listPlays(tenantId: string, scope: { assigneeId?: string } = {}): Promise<Play[]> {
  const rows = await db
    .select({ play: coachingPlays, name: tenantMembers.displayName })
    .from(coachingPlays)
    .leftJoin(
      tenantMembers,
      and(eq(tenantMembers.tenantId, coachingPlays.tenantId), eq(tenantMembers.userId, coachingPlays.assigneeId)),
    )
    .where(
      and(
        eq(coachingPlays.tenantId, tenantId),
        scope.assigneeId ? eq(coachingPlays.assigneeId, scope.assigneeId) : undefined,
      ),
    )
    .orderBy(desc(coachingPlays.createdAt));
  return rows.map(({ play, name }) => ({
    id: play.id,
    assigneeId: play.assigneeId,
    assigneeName: name ?? "Former member",
    title: play.title,
    detail: play.detail,
    status: play.status,
    createdAt: play.createdAt.toISOString(),
    completedAt: play.completedAt?.toISOString() ?? null,
  }));
}

export async function createPlay(values: {
  tenantId: string;
  assigneeId: string;
  assignedBy: string;
  title: string;
  detail: string | null;
}) {
  const [play] = await db.insert(coachingPlays).values(values).returning();
  return play;
}

export async function findPlay(tenantId: string, playId: string) {
  const [play] = await db
    .select()
    .from(coachingPlays)
    .where(and(eq(coachingPlays.tenantId, tenantId), eq(coachingPlays.id, playId)))
    .limit(1);
  return play ?? null;
}

export async function setPlayStatus(tenantId: string, playId: string, status: "open" | "done") {
  await db
    .update(coachingPlays)
    .set({ status, completedAt: status === "done" ? new Date() : null })
    .where(and(eq(coachingPlays.tenantId, tenantId), eq(coachingPlays.id, playId)));
}

export async function deletePlay(tenantId: string, playId: string) {
  await db.delete(coachingPlays).where(and(eq(coachingPlays.tenantId, tenantId), eq(coachingPlays.id, playId)));
}
