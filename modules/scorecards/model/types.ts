export type ScorecardId = "all_calls" | "retention" | "sales";

export type Grade = "gold" | "green" | "below";

export interface ScorecardItem {
  name: string;
  /** What the employee must do to earn the point, from the call manuals. Shown to managers and to the grader. */
  criteria: string;
}

export interface ScorecardSection {
  title: string;
  items: readonly ScorecardItem[];
  /**
   * Sales objection handling: when the customer raises no objections the rep
   * is awarded every point in the section automatically.
   */
  autoAwardWhenNotApplicable?: boolean;
}

export interface Scorecard {
  id: ScorecardId;
  name: string;
  sections: readonly ScorecardSection[];
  /** Minimum points for each grade. Anything lower is "below". */
  thresholds: { gold: number; green: number };
}

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
}

export interface ScorecardResult {
  scorecardId: ScorecardId;
  points: number;
  maxPoints: number;
  grade: Grade;
  items: ScorecardItemResult[];
}
