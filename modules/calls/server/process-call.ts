import "server-only";
import type { CallAnalysisStep } from "@/core/calls";
import { downloadRecording } from "@/core/storage";
import { analyzeCall } from "./analyze-call";
import { updateCall } from "./call-repository";
import { transcribe } from "./transcribe";

/**
 * Runs an uploaded recording through the pipeline:
 * transcribe → classify + extract outcome → steps from other enabled modules.
 * `steps` is injected by the caller so this module never imports another module.
 * Each stage is saved as it finishes, so a failure keeps what already worked.
 */
export async function processCall(
  call: { id: string; tenant: string; fileName: string; recordingPath: string },
  steps: readonly CallAnalysisStep[],
): Promise<void> {
  try {
    const blob = await downloadRecording(call.recordingPath);
    const audio = new File([blob], call.fileName, { type: blob.type });

    const { durationSec, segments } = await transcribe(audio);
    await updateCall(call.id, { durationSec: Math.round(durationSec), transcript: segments });

    const { callType, employeeName, outcome } = await analyzeCall(segments);
    await updateCall(call.id, { callType, employeeName, outcome });

    const input = { tenant: call.tenant, callId: call.id, callType, transcript: segments };
    const results = await Promise.all(steps.map((s) => s.run(input)));
    const analyses = Object.fromEntries(steps.map((s, i) => [s.moduleId, results[i]]));

    await updateCall(call.id, { analyses, status: "ready", error: null });
  } catch (err) {
    await updateCall(call.id, {
      status: "failed",
      error: err instanceof Error ? err.message : "Processing failed",
    });
  }
}
