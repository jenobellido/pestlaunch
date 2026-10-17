import "server-only";
import type { CallType, TranscriptSegment } from "@/core/calls";
import type { CallOutcome } from "../model/types";

export interface CallAnalysis {
  callType: CallType;
  employeeName: string | null;
  outcome: CallOutcome;
}

/** Classifies the call and extracts the outcome and key details. */
export async function analyzeCall(
  _transcript: readonly TranscriptSegment[],
): Promise<CallAnalysis> {
  // TODO: LLM call with the call-type definitions from the manuals and a strict output schema.
  throw new Error("Call analysis is not implemented yet.");
}
