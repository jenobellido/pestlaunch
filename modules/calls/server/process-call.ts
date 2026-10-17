import "server-only";
import type { CallAnalysisStep } from "@/core/calls";
import type { CallRecord } from "../model/types";
import { analyzeCall } from "./analyze-call";
import { saveCall } from "./call-repository";
import { transcribe } from "./transcribe";

/**
 * Runs a recording through the pipeline:
 * transcribe → classify + extract outcome → steps from other enabled modules.
 * `steps` is injected by the caller so this module never imports another module.
 */
export async function processCall(
  tenant: string,
  audio: File,
  steps: readonly CallAnalysisStep[],
): Promise<CallRecord> {
  const call: CallRecord = {
    id: crypto.randomUUID(),
    tenant,
    fileName: audio.name,
    employeeName: null,
    status: "processing",
    createdAt: new Date().toISOString(),
    analyses: {},
  };
  await saveCall(call);

  try {
    const { durationSec, segments } = await transcribe(audio);
    const { callType, employeeName, outcome } = await analyzeCall(segments);
    Object.assign(call, { durationSec, transcript: segments, callType, employeeName, outcome });

    const input = { tenant, callId: call.id, callType, transcript: segments };
    const results = await Promise.all(steps.map((s) => s.run(input)));
    steps.forEach((s, i) => (call.analyses[s.moduleId] = results[i]));

    call.status = "ready";
  } catch (err) {
    call.status = "failed";
    call.error = err instanceof Error ? err.message : "Processing failed";
  }

  await saveCall(call);
  return call;
}
