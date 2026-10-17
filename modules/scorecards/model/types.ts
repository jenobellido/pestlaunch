export type ScorecardId = "all_calls" | "retention" | "sales";

export type Grade = "gold" | "green" | "below";

export interface ScorecardSection {
  title: string;
  items: readonly string[];
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
  /** Transcript quote supporting the decision, so a manager can verify it. */
  evidence: string | null;
}

export interface ScorecardResult {
  scorecardId: ScorecardId;
  points: number;
  maxPoints: number;
  grade: Grade;
  items: ScorecardItemResult[];
}
