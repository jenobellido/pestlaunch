"use server";

import { refresh } from "next/cache";
import { checkTenantAccess } from "@/core/tenancy";
import { areasFor } from "./areas";
import { loadExampleData, removeExampleData } from "./example-data";

export type ExampleResult = { ok: true } | { ok: false; error: string };

async function uploader(slug: string) {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { error: "Your session ended. Log in again." } as const;
  // It adds and removes users and calls company-wide, so it's company setup, not uploading.
  if (!areasFor(result.access.permissions).exampleData) return { error: "Only people who manage the company can change example data." } as const;
  return { tenantId: result.access.tenant.id, userId: result.access.user.id } as const;
}

/** Loads the example calls, reps, follow-ups and plays. No AI runs; their results come with them. */
export async function loadExamples(slug: string): Promise<ExampleResult> {
  const u = await uploader(slug);
  if ("error" in u) return { ok: false, error: u.error! };
  try {
    await loadExampleData(u.tenantId, u.userId);
  } catch (err) {
    console.error("[examples] load failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "The example data couldn't be loaded. Try again." };
  }
  refresh();
  return { ok: true };
}

/** Removes all example data; the company's own calls and people stay. */
export async function removeExamples(slug: string): Promise<ExampleResult> {
  const u = await uploader(slug);
  if ("error" in u) return { ok: false, error: u.error! };
  try {
    await removeExampleData(u.tenantId);
  } catch (err) {
    console.error("[examples] remove failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "The example data couldn't be removed. Try again." };
  }
  refresh();
  return { ok: true };
}
