import "server-only";
import { connection } from "next/server";
import type { CallRecord } from "../model/types";

// In-memory placeholder. Replace with a database table scoped by tenant.
const store = new Map<string, CallRecord>();

export async function listCalls(tenant: string): Promise<CallRecord[]> {
  await connection();
  return [...store.values()]
    .filter((c) => c.tenant === tenant)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCall(tenant: string, id: string): Promise<CallRecord | null> {
  await connection();
  const call = store.get(id);
  return call?.tenant === tenant ? call : null;
}

export async function saveCall(call: CallRecord): Promise<void> {
  store.set(call.id, call);
}
