"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { activeCallTypes, findCallType } from "@/core/calls";
import { getCallTypes } from "@/core/calls/server";
import { can, checkTenantAccess } from "@/core/tenancy";
import type { CallReview } from "@/modules/calls";
import { applyCallReview, getCall, rescoreCall } from "@/modules/calls/server";
import { getAnalysisSteps } from "@/modules/registry.server";
import { getScorecardResult, overrideScorecardItem } from "@/modules/scorecards";

export type ReviewResult = { ok: true; message: string } | { ok: false; error: string };

const RESOLUTIONS = ["booked", "retained", "cancelled", "resolved", "follow_up_needed", "unresolved"] as const;
const RESOLUTION_LABEL: Record<(typeof RESOLUTIONS)[number], string> = {
  booked: "Booked",
  retained: "Saved",
  cancelled: "Cancelled",
  resolved: "Resolved",
  follow_up_needed: "Follow-up needed",
  unresolved: "Unresolved",
};

const reviewInput = z.object({
  callType: z.string().trim().min(1).max(64),
  resolution: z.enum(RESOLUTIONS).nullable(),
  note: z.string().trim().max(500),
});

/** Loads the call for a reviewer, or explains why they can't review it. */
async function forReview(slug: string, callId: string) {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { error: "Your session ended. Log in again." } as const;
  if (!can(result.access, "calls.review")) return { error: "You don't have permission to review calls." } as const;
  const call = z.uuid().safeParse(callId).success ? await getCall(slug, callId) : null;
  if (!call) return { error: "That call doesn't exist." } as const;
  if (call.status !== "ready") return { error: "Wait until the call has finished processing." } as const;
  const { user, tenant } = result.access;
  return { call, tenantId: tenant.id, reviewer: { id: user.id, name: user.name ?? user.email } } as const;
}

function reviewWith(previous: CallReview | null | undefined, reviewer: { id: string; name: string }, note: string | null, changes: string[]): CallReview {
  return {
    reviewedBy: reviewer.id,
    reviewerName: reviewer.name,
    reviewedAt: new Date().toISOString(),
    note: note || previous?.note || null,
    // Keep earlier corrections so the history of what changed stays visible.
    changes: [...(previous?.changes ?? []), ...changes],
  };
}

/** Corrects the call type and outcome (optional), adds a note and marks the call reviewed. */
export async function reviewCall(
  slug: string,
  callId: string,
  input: { callType: string; resolution: string | null; note: string },
): Promise<ReviewResult> {
  const parsed = reviewInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a call type and outcome." };
  const loaded = await forReview(slug, callId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { call, reviewer, tenantId } = loaded;
  const { callType, resolution, note } = parsed.data;
  const catalog = await getCallTypes(tenantId);
  // A reviewer can pick any of the company's enabled types, or keep the one the call has.
  if (callType !== call.callType && !activeCallTypes(catalog).some((t) => t.key === callType)) {
    return { ok: false, error: "That call type isn't available." };
  }

  const changes: string[] = [];
  const typeChanged = call.callType !== callType;
  if (typeChanged) {
    const from = call.callType ? findCallType(catalog, call.callType).name : "none";
    changes.push(`Call type: ${from} → ${findCallType(catalog, callType).name}`);
  }
  const outcome = call.outcome && resolution && resolution !== call.outcome.resolution
    ? { ...call.outcome, resolution }
    : call.outcome;
  if (call.outcome && outcome !== call.outcome) {
    changes.push(`Outcome: ${RESOLUTION_LABEL[call.outcome.resolution]} → ${RESOLUTION_LABEL[resolution!]}`);
  }

  await applyCallReview(slug, callId, {
    callType,
    // A person chose it, so a retry never lets the AI change it back.
    typeLocked: typeChanged ? true : undefined,
    outcome: outcome ?? null,
    review: reviewWith(call.review, reviewer, note || null, changes),
  });

  // A different call type means a different scorecard: re-grade in the background.
  if (typeChanged && call.transcript?.length) {
    const steps = await getAnalysisSteps(slug);
    after(() => rescoreCall({ id: call.id, tenant: slug, tenantId, callType, transcript: call.transcript! }, steps));
  }
  refresh();
  return {
    ok: true,
    message: typeChanged ? "Saved. Re-scoring against the right scorecard now." : changes.length ? "Corrections saved." : "Marked as reviewed.",
  };
}

/** Flips one scorecard step to passed or missed; points and grade are recomputed. */
export async function correctScoreItem(slug: string, callId: string, index: number, passed: boolean): Promise<ReviewResult> {
  const loaded = await forReview(slug, callId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { call, reviewer } = loaded;
  const result = getScorecardResult(call.analyses);
  if (!result || !Number.isInteger(index) || !result.items[index]) return { ok: false, error: "That scorecard step doesn't exist." };

  const item = result.items[index];
  const updated = overrideScorecardItem(result, index, passed, `Corrected by ${reviewer.name}.`);
  await applyCallReview(slug, callId, {
    analyses: { ...call.analyses, scorecards: updated },
    review: reviewWith(call.review, reviewer, null, [`${item.item}: ${passed ? "missed → passed" : "passed → missed"}`]),
  });
  refresh();
  return { ok: true, message: `${item.item} marked ${passed ? "passed" : "missed"}. Score is now ${updated.points}/${updated.maxPoints}.` };
}
