import type { ScorecardDefinition } from "@/core/calls";

export type { ScorecardItem, ScorecardSection } from "@/core/calls";

/** A scorecard's id: one of the manuals' ("all_calls", "retention", "sales") or a company's own call type key. */
export type ScorecardId = string;

export type Grade = "gold" | "green" | "below";

export type Scorecard = ScorecardDefinition;

export interface ScorecardItemResult {
  section: string;
  item: string;
  passed: boolean;
  /** Transcript quote supporting the decision, so a manager can verify it. Only kept when it's really in the transcript. */
  evidence: string | null;
  /** One sentence on why the point was given or missed. */
  reason: string;
  /** Given automatically, e.g. objection handling on a sales call with no objections. */
  autoAwarded?: boolean;
  /** Changed by a reviewer, overriding the AI's judgement. */
  corrected?: boolean;
  /** What the step asks for, kept with the result so it reads right after the scorecard changes. */
  criteria?: string;
}

export interface ScorecardResult {
  scorecardId: ScorecardId;
  /** Kept with the result so a call still reads right after its company edits or removes the scorecard. Older results don't have them. */
  scorecardName?: string;
  thresholds?: { gold: number; green: number };
  points: number;
  maxPoints: number;
  grade: Grade;
  items: ScorecardItemResult[];
}
