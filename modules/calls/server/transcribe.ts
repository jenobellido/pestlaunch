import "server-only";
import type { TranscriptSegment } from "@/core/calls";

export interface TranscriptionResult {
  durationSec: number;
  segments: TranscriptSegment[];
}

/** Speech-to-text with speaker labels (employee vs customer). */
export async function transcribe(_audio: File): Promise<TranscriptionResult> {
  // TODO: call a speech-to-text provider with diarization.
  throw new Error("Transcription is not implemented yet.");
}
