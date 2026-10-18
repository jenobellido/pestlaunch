import { SCORECARDS } from "../config/scorecards";
import { borderlineReason, gradeFor } from "./grade";
import type { ScorecardResult } from "./types";

/** The grade lines a result was scored against: saved with it, or the manual's for older results. */
function thresholdsOf(result: ScorecardResult) {
  return result.thresholds ?? SCORECARDS[result.scorecardId]?.thresholds ?? { gold: result.maxPoints, green: result.maxPoints };
}
const asCard = (result: ScorecardResult) => ({ thresholds: thresholdsOf(result) });

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
  return { ...result, items, points, grade: gradeFor(asCard(result), points) };
}

/** Why a score needs a person's check, or null. Corrected scorecards are already checked. */
export function scorecardReviewFlag(result: ScorecardResult): string | null {
  if (result.items.some((i) => i.corrected)) return null;
  return borderlineReason(asCard(result), result.points);
}

/**
 * What a scorecard step asks for, for coaching ("what good sounds like"): from a result that
 * carries it, else the manual's scorecard of that id.
 */
export function stepCriteria(
  scorecardId: ScorecardResult["scorecardId"],
  section: string,
  item: string,
  result?: ScorecardResult,
): string | null {
  const saved = result?.items.find((i) => i.section === section && i.item === item)?.criteria;
  if (saved) return saved;
  const card = SCORECARDS[scorecardId];
  return card?.sections.find((s) => s.title === section)?.items.find((i) => i.name === item)?.criteria ?? null;
}
