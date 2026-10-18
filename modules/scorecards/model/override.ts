import { SCORECARDS } from "../config/scorecards";
import { borderlineReason, gradeFor } from "./grade";
import type { ScorecardResult } from "./types";

/**
 * A reviewer's correction to one scorecard item: sets pass or fail, records why, and
 * recomputes points and grade from the scorecard so the maths stays consistent.
 */
export function overrideScorecardItem(
  result: ScorecardResult,
  index: number,
  passed: boolean,
  reason: string,
): ScorecardResult {
  if (index < 0 || index >= result.items.length) throw new RangeError("No such scorecard item.");
  const items = result.items.map((item, i) =>
    i === index ? { ...item, passed, reason, corrected: true, autoAwarded: false } : item,
  );
  const points = items.filter((i) => i.passed).length;
  return { ...result, items, points, grade: gradeFor(SCORECARDS[result.scorecardId], points) };
}

/** Why a score needs a person's check, or null. Corrected scorecards are already checked. */
export function scorecardReviewFlag(result: ScorecardResult): string | null {
  if (result.items.some((i) => i.corrected)) return null;
  return borderlineReason(SCORECARDS[result.scorecardId], result.points);
}
