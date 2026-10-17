import "server-only";
import type { CallAnalysisStep } from "@/core/calls";
import { coachingStep } from "./coaching/server";
import { scoringStep } from "./scorecards/server";
import { getEnabledModuleIds, type ModuleId } from "./registry";

// Analysis steps each module contributes to call processing.
const analysisSteps: Partial<Record<ModuleId, CallAnalysisStep>> = {
  scorecards: scoringStep,
  coaching: coachingStep,
};

/** Steps to run for a tenant: only those of modules the tenant has enabled. */
export async function getAnalysisSteps(tenantSlug: string): Promise<CallAnalysisStep[]> {
  const enabled = await getEnabledModuleIds(tenantSlug);
  return [...enabled].flatMap((id) => analysisSteps[id] ?? []);
}
