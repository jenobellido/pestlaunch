import "server-only";
import type { CallAnalysisStep, TranscriptSegment } from "@/core/calls";
import { downloadRecording } from "@/core/storage";
import { analyzeCall } from "./analyze-call";
import { updateCall } from "./call-repository";
import { transcribe } from "./transcribe";

/**
 * Runs an uploaded recording through the pipeline:
 * transcribe → classify + extract outcome → steps from other enabled modules.
 * `steps` is injected by the caller so this module never imports another module.
 * Each stage is saved as it finishes (with the next stage, so the UI can show progress),
 * and a failure keeps what already worked. Pass `transcript` to skip transcription on a retry.
 */
export async function processCall(
  call: { id: string; tenant: string; fileName: string; recordingPath: string },
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
    await updateCall(call.id, { callType, employeeName, outcome, stage: "reviewing" });

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
