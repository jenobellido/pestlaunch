import "server-only";
import { and, desc, eq, getTableColumns, lt, or } from "drizzle-orm";
import { connection } from "next/server";
import { z } from "zod";
import { db, schema } from "@/core/db";
import type { CallRecord } from "../model/types";
import { calls } from "./schema";

// Every query joins tenants on the slug, so a call is only ever read or changed
// through the tenant it belongs to.

const { tenants, tenantMembers } = schema;
type CallRow = typeof calls.$inferSelect;

/** Which calls a member may see: everything, or only calls assigned to them. */
export type CallScope = { employeeId?: string };

/** The assigned member's display name, joined on the call's own tenant. */
const memberJoin = and(eq(tenantMembers.tenantId, calls.tenantId), eq(tenantMembers.userId, calls.employeeId));
const scoped = (scope: CallScope) => (scope.employeeId ? eq(calls.employeeId, scope.employeeId) : undefined);

/**
 * Processing runs after the upload response. If the server stops mid-way (a deploy, a crash,
 * a platform time limit) the row would say "processing" forever, so a call that hasn't moved
 * on for this long is shown as failed and can be retried. Each stage saves, so this is per stage.
 */
const STALLED_AFTER_MS = 10 * 60 * 1000;

export function isStalled(row: Pick<CallRow, "status" | "updatedAt">) {
  return row.status === "processing" && Date.now() - row.updatedAt.getTime() > STALLED_AFTER_MS;
}

function toRecord(
  row: Omit<CallRow, "transcript"> & { transcript?: CallRow["transcript"] },
  tenant: string,
  memberName: string | null,
): CallRecord {
  const stalled = isStalled(row);
  return {
    id: row.id,
    tenant,
    fileName: row.fileName,
    employeeName: (row.employeeId && memberName) || row.employeeName,
    employeeId: row.employeeId,
    heardEmployeeName: row.employeeName,
    status: stalled ? "failed" : row.status,
    stage: row.status === "processing" && !stalled ? (row.stage ?? undefined) : undefined,
    error: stalled ? "Processing stopped before it finished. Retry to run it again." : (row.error ?? undefined),
    createdAt: row.createdAt.toISOString(),
    durationSec: row.durationSec ?? undefined,
    callType: row.callType ?? undefined,
    transcript: row.transcript ?? undefined,
    outcome: row.outcome ?? undefined,
    analyses: row.analyses,
  };
}

const isUuid = (id: string) => z.uuid().safeParse(id).success;

/** Newest first. Transcripts are left out; the list doesn't show them. */
export async function listCalls(tenant: string, scope: CallScope = {}): Promise<CallRecord[]> {
  await connection();
  const { transcript: _transcript, ...columns } = getTableColumns(calls);
  const rows = await db
    .select({ call: columns, memberName: tenantMembers.displayName })
    .from(calls)
    .innerJoin(tenants, eq(tenants.id, calls.tenantId))
    .leftJoin(tenantMembers, memberJoin)
    .where(and(eq(tenants.slug, tenant), scoped(scope)))
    .orderBy(desc(calls.createdAt));
  return rows.map((r) => toRecord(r.call, tenant, r.memberName));
}

export async function getCall(tenant: string, id: string, scope: CallScope = {}): Promise<CallRecord | null> {
  await connection();
  if (!isUuid(id)) return null;
  const [r] = await db
    .select({ call: getTableColumns(calls), memberName: tenantMembers.displayName })
    .from(calls)
    .innerJoin(tenants, eq(tenants.id, calls.tenantId))
    .leftJoin(tenantMembers, memberJoin)
    .where(and(eq(tenants.slug, tenant), eq(calls.id, id), scoped(scope)))
    .limit(1);
  return r ? toRecord(r.call, tenant, r.memberName) : null;
}

/** The raw row, including the recording path, for server-side use. */
export async function findCallRow(tenant: string, id: string, scope: CallScope = {}): Promise<CallRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select(getTableColumns(calls))
    .from(calls)
    .innerJoin(tenants, eq(tenants.id, calls.tenantId))
    .where(and(eq(tenants.slug, tenant), eq(calls.id, id), scoped(scope)))
    .limit(1);
  return row ?? null;
}

export async function insertCall(values: {
  tenantId: string;
  fileName: string;
  recordingPath: string;
  employeeId: string | null;
}) {
  const [row] = await db.insert(calls).values(values).returning();
  return row;
}

export type CallUpdate = Partial<
  Pick<
    CallRow,
    "status" | "stage" | "error" | "employeeId" | "employeeName" | "durationSec" | "callType" | "transcript" | "outcome" | "analyses"
  >
>;

export async function updateCall(id: string, values: CallUpdate): Promise<void> {
  await db
    .update(calls)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(calls.id, id));
}

/**
 * Moves a failed (or stalled) call back to processing and returns it, or null when it isn't
 * retryable. One conditional update, so two retries at once can't both start the pipeline.
 */
export async function claimCallForRetry(tenant: string, id: string, scope: CallScope = {}): Promise<CallRow | null> {
  const row = await findCallRow(tenant, id, scope);
  if (!row) return null;
  const stalledBefore = new Date(Date.now() - STALLED_AFTER_MS);
  const [claimed] = await db
    .update(calls)
    .set({ status: "processing", stage: null, error: null, updatedAt: new Date() })
    .where(
      and(
        eq(calls.id, row.id),
        or(eq(calls.status, "failed"), and(eq(calls.status, "processing"), lt(calls.updatedAt, stalledBefore))),
      ),
    )
    .returning();
  return claimed ?? null;
}

/** Deletes the call row and returns it, so the caller can remove the recording too. */
export async function deleteCallRow(tenant: string, id: string): Promise<CallRow | null> {
  const row = await findCallRow(tenant, id);
  if (!row) return null;
  await db.delete(calls).where(eq(calls.id, row.id));
  return row;
}

/** Assigns the call to a team member (or unassigns it with null). */
export async function setCallEmployee(tenant: string, id: string, employeeId: string | null): Promise<boolean> {
  const row = await findCallRow(tenant, id);
  if (!row) return false;
  await db.update(calls).set({ employeeId, updatedAt: new Date() }).where(eq(calls.id, row.id));
  return true;
}
