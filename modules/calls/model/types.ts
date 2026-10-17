import type { CallType, TranscriptSegment } from "@/core/calls";

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

export interface CallOutcome {
  summary: string;
  resolution: CallResolution;
  /** Key facts pulled from the call, e.g. pest, address, appointment date, price quoted. */
  details: { label: string; value: string }[];
  followUps: string[];
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
  transcript?: TranscriptSegment[];
  outcome?: CallOutcome;
  /** Results from module analysis steps, keyed by module id. */
  analyses: Record<string, unknown>;
}
