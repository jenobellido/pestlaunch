"use server";

import { refresh } from "next/cache";
import { can, checkTenantAccess } from "@/core/tenancy";
import { loadExampleCalls, removeExampleCalls } from "@/modules/calls/server";

export type ExampleResult = { ok: true } | { ok: false; error: string };

/** Loads the 7 invented example calls into this company. No AI runs; their results come with them. */
export async function loadExamples(slug: string): Promise<ExampleResult> {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { ok: false, error: "Your session ended. Log in again." };
  if (!can(result.access, "calls.upload")) return { ok: false, error: "You don't have permission to add calls." };
  await loadExampleCalls(result.access.tenant.id);
  refresh();
  return { ok: true };
}

/** Removes the example calls; the company's own calls stay. */
export async function removeExamples(slug: string): Promise<ExampleResult> {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { ok: false, error: "Your session ended. Log in again." };
  if (!can(result.access, "calls.upload")) return { ok: false, error: "You don't have permission to remove calls." };
  await removeExampleCalls(result.access.tenant.id);
  refresh();
  return { ok: true };
}
