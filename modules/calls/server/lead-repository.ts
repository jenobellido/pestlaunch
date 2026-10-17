import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/core/db";
import type { CallOutcome } from "../model/types";
import type { CallScope } from "./call-repository";
import { calls, leads } from "./schema";

const { tenants, tenantMembers } = schema;

export type LeadStage = (typeof leads.$inferSelect)["stage"];
export const LEAD_STAGES: { id: LeadStage; label: string }[] = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "booked", label: "Booked" },
  { id: "lost", label: "Lost" },
];

export interface Lead {
  id: string;
  callId: string;
  callTitle: string;
  stage: LeadStage;
  customerName: string | null;
  need: string | null;
  priceQuoted: string | null;
  repName: string | null;
  createdAt: string;
  followUp: string | null;
}

const detail = (outcome: CallOutcome, label: string) => outcome.details.find((d) => d.label === label)?.value ?? null;

/** Creates the lead for an analyzed new-customer call, or refreshes its details on a re-run. */
export async function upsertLeadForCall(call: { id: string; tenantId: string }, outcome: CallOutcome) {
  const values = {
    customerName: detail(outcome, "Customer name"),
    need: detail(outcome, "Pest"),
    priceQuoted: detail(outcome, "Price quoted"),
  };
  await db
    .insert(leads)
    .values({ tenantId: call.tenantId, callId: call.id, stage: outcome.resolution === "booked" ? "booked" : "new", ...values })
    .onConflictDoUpdate({ target: leads.callId, set: { ...values, updatedAt: new Date() } });
}

/** A tenant's leads, newest first, limited to the member's own calls without "calls.view_all". */
export async function listLeads(tenant: string, scope: CallScope = {}): Promise<Lead[]> {
  const rows = await db
    .select({ lead: leads, call: calls, memberName: tenantMembers.displayName })
    .from(leads)
    .innerJoin(calls, eq(calls.id, leads.callId))
    .innerJoin(tenants, eq(tenants.id, leads.tenantId))
    .leftJoin(tenantMembers, and(eq(tenantMembers.tenantId, calls.tenantId), eq(tenantMembers.userId, calls.employeeId)))
    .where(and(eq(tenants.slug, tenant), scope.employeeId ? eq(calls.employeeId, scope.employeeId) : undefined))
    .orderBy(desc(leads.createdAt));
  return rows.map(({ lead, call, memberName }) => ({
    id: lead.id,
    callId: lead.callId,
    callTitle: call.fileName.replace(/\.[^.]+$/, ""),
    stage: lead.stage,
    customerName: lead.customerName,
    need: lead.need,
    priceQuoted: lead.priceQuoted,
    repName: (call.employeeId && memberName) || call.employeeName,
    createdAt: lead.createdAt.toISOString(),
    followUp: call.outcome?.followUps[0] ?? null,
  }));
}

/** Moves a lead to another stage; false when it isn't visible to the member. */
export async function setLeadStage(tenant: string, leadId: string, stage: LeadStage, scope: CallScope = {}) {
  const visible = (await listLeads(tenant, scope)).some((l) => l.id === leadId);
  if (!visible) return false;
  await db.update(leads).set({ stage, updatedAt: new Date() }).where(eq(leads.id, leadId));
  return true;
}
