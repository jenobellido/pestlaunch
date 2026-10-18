import type { CallType, CallTypeGroup, TranscriptSegment } from "@/core/calls";

export type CallStatus = "processing" | "ready" | "failed";

/** Where a processing call is in the pipeline. */
export type ProcessingStage = "transcribing" | "analyzing" | "reviewing";

export type CallResolution =
  | "booked"
  | "retained"
  | "cancelled"
  | "resolved"
  | "unresolved"
  | "follow_up_needed";

/** Why a customer wanted to cancel, as a fixed category so reasons can be counted. */
export const CANCEL_REASONS = [
  "Price",
  "No longer needed",
  "Service quality",
  "Moving",
  "Switching company",
  "Scheduling",
  "Other",
] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export interface CallOutcome {
  summary: string;
  resolution: CallResolution;
  /** Key facts pulled from the call, e.g. pest, address, appointment date, price quoted. */
  details: { label: string; value: string }[];
  followUps: string[];
  /** Retention calls only: the main reason the customer wanted to cancel. */
  cancelReason?: CancelReason | null;
}

/** A person's check of the AI's results on a call. */
export interface CallReview {
  reviewedBy: string;
  reviewerName: string;
  reviewedAt: string;
  note: string | null;
  /** What they changed, in words, e.g. "Call type: Scheduling → Re-service". */
  changes: string[];
}

export interface CallRecord {
  id: string;
  tenant: string;
  fileName: string;
  /** Who the call belongs to: the assigned team member's name, else the name heard in the call. */
  employeeName: string | null;
  /** The team member the call belongs to; null while unassigned. */
  employeeId: string | null;
  /** The employee's name as heard in the call, kept as a hint (e.g. to spot a wrong assignment). */
  heardEmployeeName: string | null;
  status: CallStatus;
  /** Set while `status` is "processing". */
  stage?: ProcessingStage;
  error?: string;
  createdAt: string;
  durationSec?: number;
  callType?: CallType;
  /** The type's name and group in the company's call types (resolved when the call is read). */
  callTypeName?: string;
  callTypeGroup?: CallTypeGroup;
  transcript?: TranscriptSegment[];
  outcome?: CallOutcome;
  /** Results from module analysis steps, keyed by module id. */
  analyses: Record<string, unknown>;
  /** Set once someone has checked and, if needed, corrected the AI's results. */
  review?: CallReview | null;
}

/**
 * A stretch of the recording to mark under the player's timeline, e.g. where the call was
 * positive or negative. Other modules supply these through the app layer, so calls never
 * imports them.
 */
export interface TimelineBand {
  start: number;
  end: number;
  tone: "positive" | "neutral" | "negative";
  /** Read on hover and by screen readers, e.g. "Negative". */
  label: string;
}
