import "server-only";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db, schema } from "@/core/db";
import { isBuiltInCallType, mergeCallTypes, type CallTypeMode, type CallTypeOverride } from "./catalog";
import type { CallTypeDefinition, ScorecardDefinition } from "./types";

const { tenants, tenantCallTypes } = schema;

/** A company's call types: defaults with its changes, then its own (see catalog.ts). */
export async function getCallTypes(tenantId: string): Promise<CallTypeDefinition[]> {
  const rows = await db
    .select()
    .from(tenantCallTypes)
    .where(eq(tenantCallTypes.tenantId, tenantId))
    .orderBy(asc(tenantCallTypes.position), asc(tenantCallTypes.createdAt));
  return mergeCallTypes(
    rows.map((r) => ({
      key: r.key,
      name: r.name,
      description: r.description,
      group: r.group,
      scorecard: (r.scorecard as ScorecardDefinition | null) ?? null,
      enabled: r.enabled,
    })),
  );
}

/** Saves a company's version of a call type: an edit to a built-in, or one of its own. */
export async function saveCallType(tenantId: string, type: CallTypeOverride) {
  const values = {
    name: type.name,
    description: type.description,
    group: type.group,
    scorecard: type.scorecard,
    enabled: type.enabled,
    updatedAt: new Date(),
  };
  // New custom types go last; built-ins keep their place in the default order anyway.
  const [{ n }] = await db.select({ n: count() }).from(tenantCallTypes).where(eq(tenantCallTypes.tenantId, tenantId));
  await db
    .insert(tenantCallTypes)
    .values({ tenantId, key: type.key, position: n, ...values })
    .onConflictDoUpdate({ target: [tenantCallTypes.tenantId, tenantCallTypes.key], set: values });
}

/** Turns a type on or off without touching the rest of it. */
export async function setCallTypeEnabled(tenantId: string, current: CallTypeDefinition, enabled: boolean) {
  await saveCallType(tenantId, { ...current, enabled });
}

/** Puts a built-in type back to the default by forgetting the company's version. */
export async function resetCallType(tenantId: string, key: string) {
  if (!isBuiltInCallType(key)) return;
  await db.delete(tenantCallTypes).where(and(eq(tenantCallTypes.tenantId, tenantId), eq(tenantCallTypes.key, key)));
}

/** Deletes one of the company's own types. Callers check no calls use it first. */
export async function deleteCallType(tenantId: string, key: string) {
  if (isBuiltInCallType(key)) return;
  await db.delete(tenantCallTypes).where(and(eq(tenantCallTypes.tenantId, tenantId), eq(tenantCallTypes.key, key)));
}

/** How many of the company's calls have this type, so a used type is turned off, not deleted. */
export async function countCallsOfType(tenantId: string, key: string): Promise<number> {
  const result = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from calls where tenant_id = ${tenantId} and call_type = ${key}`,
  );
  return Number(result[0]?.n ?? 0);
}

/** How many of the company's calls each type has, by key. */
export async function countCallsByType(tenantId: string): Promise<Map<string, number>> {
  const rows = await db.execute<{ key: string; n: number }>(
    sql`select call_type as key, count(*)::int as n from calls where tenant_id = ${tenantId} and call_type is not null group by call_type`,
  );
  return new Map(rows.map((r) => [r.key, Number(r.n)]));
}

export async function getCallTypeMode(tenantId: string): Promise<CallTypeMode> {
  const [row] = await db.select({ mode: tenants.callTypeMode }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row?.mode === "ask" ? "ask" : "auto";
}

export async function setCallTypeMode(tenantId: string, mode: CallTypeMode) {
  await db.update(tenants).set({ callTypeMode: mode }).where(eq(tenants.id, tenantId));
}
