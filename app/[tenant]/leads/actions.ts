"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { checkTenantAccess } from "@/core/tenancy";
import { callScope, setLeadStage } from "@/modules/calls/server";

const input = z.object({ leadId: z.uuid(), stage: z.enum(["new", "contacted", "booked", "lost"]) });

/** Moves a lead along the pipeline. Members without "calls.view_all" can move only their own. */
export async function moveLead(slug: string, leadId: string, stage: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = input.safeParse({ leadId, stage });
  if (!parsed.success) return { ok: false, error: "That isn't a pipeline stage." };
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { ok: false, error: "Your session ended. Log in again." };
  const { user, permissions } = result.access;
  const moved = await setLeadStage(slug, parsed.data.leadId, parsed.data.stage, callScope({ userId: user.id, permissions }));
  if (!moved) return { ok: false, error: "That lead doesn't exist." };
  refresh();
  return { ok: true };
}
