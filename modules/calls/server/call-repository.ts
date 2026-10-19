import "server-only";
import { findCallType, type CallTypeDefinition } from "@/core/calls";
import { getCallTypes } from "@/core/calls/server";
import { and, desc, eq, getTableColumns, lt, or, sql } from "drizzle-orm";
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
  catalog: readonly CallTypeDefinition[],
): CallRecord {
  const stalled = isStalled(row);
  // Names and groups come from the company's call types, so its own types read right too.
  const type = row.callType ? findCallType(catalog, row.callType) : null;
  return {
    id: row.id,
    tenant,
    fileName: row.fileName,
    // The rep is always a team member. A name heard in the call never becomes a rep; an
    // unassigned call stays unassigned, with the heard name kept separately as a hint.
    employeeName: row.employeeId ? (memberName ?? row.employeeName) : null,
    employeeId: row.employeeId,
    heardEmployeeName: row.employeeName,
    status: stalled ? "failed" : row.status,
    stage: row.status === "processing" && !stalled ? (row.stage ?? undefined) : undefined,
    error: stalled ? "Processing stopped before it finished. Retry to run it again." : (row.error ?? undefined),
    createdAt: row.createdAt.toISOString(),
    durationSec: row.durationSec ?? undefined,
    callType: row.callType ?? undefined,
    callTypeName: type?.name,
    callTypeGroup: type?.group,
    transcript: row.transcript ?? undefined,
    outcome: row.outcome ?? undefined,
    analyses: row.analyses,
    review: row.review ?? null,
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
  const catalog = rows.length ? await getCallTypes(rows[0].call.tenantId) : [];
  return rows.map((r) => toRecord(r.call, tenant, r.memberName, catalog));
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
  return r ? toRecord(r.call, tenant, r.memberName, await getCallTypes(r.call.tenantId)) : null;
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
  /** Picked by the uploader; such a type is locked so the AI keeps it. */
  callType?: string | null;
}) {
  const { callType, ...rest } = values;
  const [row] = await db
    .insert(calls)
    .values({ ...rest, ...(callType ? { callType, typeLocked: true } : {}) })
    .returning();
  return row;
}

export type CallUpdate = Partial<
  Pick<
    CallRow,
    | "status"
    | "stage"
    | "error"
    | "employeeId"
    | "employeeName"
    | "review"
    | "durationSec"
    | "callType"
    | "typeLocked"
    | "transcript"
    | "outcome"
    | "analyses"
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

export interface TranscriptMatch {
  callId: string;
  /** The first matching line, for showing in the results. */
  speaker: string;
  text: string;
  start: number;
}

/** Calls whose transcript contains `query` (case-insensitive), with the first matching line. */
export async function searchTranscripts(tenant: string, query: string, scope: CallScope = {}): Promise<TranscriptMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await db
    .select({ id: calls.id, transcript: calls.transcript })
    .from(calls)
    .innerJoin(tenants, eq(tenants.id, calls.tenantId))
    .where(
      and(
        eq(tenants.slug, tenant),
        scoped(scope),
        sql`exists (select 1 from jsonb_array_elements(${calls.transcript}) s where s->>'text' ilike ${pattern})`,
      ),
    )
    .orderBy(desc(calls.createdAt))
    .limit(100);
  const needle = q.toLowerCase();
  return rows.flatMap((r) => {
    const hit = r.transcript?.find((s) => s.text.toLowerCase().includes(needle));
    return hit ? [{ callId: r.id, speaker: hit.speaker, text: hit.text, start: hit.start }] : [];
  });
}

/** Applies a reviewer's corrections to a call in the tenant; false when it doesn't exist. */
export async function applyCallReview(tenant: string, id: string, values: CallUpdate): Promise<boolean> {
  const row = await findCallRow(tenant, id);
  if (!row) return false;
  await updateCall(row.id, values);
  return true;
}
