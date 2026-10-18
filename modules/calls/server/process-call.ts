import "server-only";
import type { CallAnalysisStep, CallType, TranscriptSegment } from "@/core/calls";
import { downloadRecording } from "@/core/storage";
import { listMembers } from "@/core/tenancy";
import { analyzeCall } from "./analyze-call";
import { updateCall } from "./call-repository";
import { upsertLeadForCall } from "./lead-repository";
import { transcribe } from "./transcribe";

/**
 * Runs an uploaded recording through the pipeline:
 * transcribe → classify + extract outcome → steps from other enabled modules.
 * `steps` is injected by the caller so this module never imports another module.
 * Each stage is saved as it finishes (with the next stage, so the UI can show progress),
 * and a failure keeps what already worked. Pass `transcript` to skip transcription on a retry.
 */
export async function processCall(
  call: {
    id: string;
    tenant: string;
    tenantId: string;
    fileName: string;
    recordingPath: string;
    employeeId: string | null;
  },
  steps: readonly CallAnalysisStep[],
  options: { transcript?: TranscriptSegment[] } = {},
): Promise<void> {
  try {
    let segments = options.transcript;
    if (!segments?.length) {
      await updateCall(call.id, { stage: "transcribing" });
      const blob = await downloadRecording(call.recordingPath);
      const audio = new File([blob], call.fileName, { type: blob.type });
      const result = await transcribe(audio);
      segments = result.segments;
      await updateCall(call.id, { durationSec: Math.round(result.durationSec), transcript: segments });
    }

    await updateCall(call.id, { stage: "analyzing" });
    const { callType, employeeName, outcome } = await analyzeCall(segments);
    // Unassigned calls (uploaded with "work it out from the call") get the team member whose
    // name the employee gave, when exactly one member matches.
    const employeeId = call.employeeId ?? (await matchEmployee(call.tenantId, employeeName));
    await updateCall(call.id, { callType, employeeName, employeeId, outcome, stage: "reviewing" });
    // Every new-customer call is a sales opportunity on the pipeline.
    if (callType === "new_customer") await upsertLeadForCall({ id: call.id, tenantId: call.tenantId }, outcome);

    const input = { tenant: call.tenant, callId: call.id, callType, transcript: segments };
    const results = await Promise.all(steps.map((s) => s.run(input)));
    const analyses = Object.fromEntries(steps.map((s, i) => [s.moduleId, results[i]]));

    await updateCall(call.id, { analyses, status: "ready", stage: null, error: null });
  } catch (err) {
    console.error(`[calls] processing ${call.id} failed`, err instanceof Error ? err.message : err);
    await updateCall(call.id, {
      status: "failed",
      stage: null,
      error: err instanceof Error ? err.message : "Processing failed",
    });
  }
}

/**
 * Re-runs only the module steps (scoring, coaching) with the call's saved transcript and call
 * type. Used after a reviewer corrects the call type, so the call is graded against the right
 * scorecard without re-analysing (which could undo the correction).
 */
export async function rescoreCall(
  call: { id: string; tenant: string; callType: CallType; transcript: TranscriptSegment[] },
  steps: readonly CallAnalysisStep[],
): Promise<void> {
  try {
    await updateCall(call.id, { status: "processing", stage: "reviewing", error: null });
    const input = { tenant: call.tenant, callId: call.id, callType: call.callType, transcript: call.transcript };
    const results = await Promise.all(steps.map((s) => s.run(input)));
    const analyses = Object.fromEntries(steps.map((s, i) => [s.moduleId, results[i]]));
    await updateCall(call.id, { analyses, status: "ready", stage: null });
  } catch (err) {
    console.error(`[calls] re-scoring ${call.id} failed`, err instanceof Error ? err.message : err);
    await updateCall(call.id, {
      status: "failed",
      stage: null,
      error: err instanceof Error ? err.message : "Re-scoring failed",
    });
  }
}

/** The one team member whose first name matches the name heard in the call, if any. */
async function matchEmployee(tenantId: string, heardName: string | null): Promise<string | null> {
  const first = (name: string) => name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const heard = heardName ? first(heardName) : "";
  if (!heard) return null;
  const matches = (await listMembers(tenantId)).filter((m) => first(m.displayName) === heard);
  return matches.length === 1 ? matches[0].userId : null;
}
