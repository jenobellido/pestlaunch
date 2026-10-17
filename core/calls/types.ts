/**
 * Shared call domain contract. Every Call Intelligence module speaks these
 * types, so they live in core instead of inside any one module.
 */

/** Matches the phone menu and call types in the PestLaunch call manuals. */
export const CALL_TYPES = [
  "new_customer",
  "scheduling",
  "billing",
  "reservice",
  "retention",
  "other",
] as const;
export type CallType = (typeof CALL_TYPES)[number];

export type Speaker = "employee" | "customer" | "unknown";

export interface TranscriptSegment {
  speaker: Speaker;
  /** Seconds from the start of the recording. */
  start: number;
  end: number;
  text: string;
}

export interface CallAnalysisInput {
  tenant: string;
  callId: string;
  callType: CallType;
  transcript: readonly TranscriptSegment[];
}

/**
 * A step a module contributes to call processing (scoring, coaching, …).
 * The calls pipeline runs the steps of every module the tenant has enabled
 * and stores each result under `analyses[moduleId]`.
 */
export interface CallAnalysisStep<Result = unknown> {
  moduleId: string;
  run(input: CallAnalysisInput): Promise<Result>;
}
