/**
 * Shared call domain contract. Every Call Intelligence module speaks these
 * types, so they live in core instead of inside any one module.
 */

/** The call types every company starts with, from the PestLaunch call manuals. */
export const BUILT_IN_CALL_TYPES = [
  "new_customer",
  "scheduling",
  "billing",
  "reservice",
  "retention",
  "other",
] as const;
export type BuiltInCallType = (typeof BUILT_IN_CALL_TYPES)[number];

/**
 * A call type's key: one of the built-in ones, or a company's own (e.g. "custom-a1b2c3").
 * Look its name, group and scorecard up in the company's catalog (core/calls/catalog.ts).
 */
export type CallType = string;

/** How PestLaunch groups calls in its Call Log and dashboards. Every call type belongs to one. */
export const CALL_TYPE_GROUPS = ["sales", "service", "billing", "retention", "other"] as const;
export type CallTypeGroup = (typeof CALL_TYPE_GROUPS)[number];

export const CALL_TYPE_GROUP_LABELS: Record<CallTypeGroup, string> = {
  sales: "Sales",
  service: "Service",
  billing: "Billing",
  retention: "Retention",
  other: "Other",
};

export interface ScorecardItem {
  name: string;
  /** What the employee must do to earn the point. Shown to managers and to the grader. */
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

export interface ScorecardDefinition {
  id: string;
  name: string;
  sections: readonly ScorecardSection[];
  /** Minimum points for each grade. Anything lower is "below". */
  thresholds: { gold: number; green: number };
}

/** One call type as a company has it set up: the default, their edited version, or their own. */
export interface CallTypeDefinition {
  key: CallType;
  name: string;
  /** How to recognise this kind of call; the AI classifies calls by these descriptions. */
  description: string;
  group: CallTypeGroup;
  /** How these calls are graded; null means they aren't scored. */
  scorecard: ScorecardDefinition | null;
  /** Off types aren't offered to the AI or on upload, but old calls keep their type. */
  enabled: boolean;
  builtIn: boolean;
  /** A built-in type the company has changed (so it can be reset). */
  customized: boolean;
}

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
  /** The company's definition of that type, with its scorecard. */
  callTypeDef: CallTypeDefinition;
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
