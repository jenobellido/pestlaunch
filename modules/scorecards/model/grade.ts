import type { CallType } from "@/core/calls";
import type { Grade, Scorecard, ScorecardId } from "./types";

export function maxPoints(card: Scorecard): number {
  return card.sections.reduce((sum, s) => sum + s.items.length, 0);
}

export function gradeFor(card: Scorecard, points: number): Grade {
  if (points >= card.thresholds.gold) return "gold";
  if (points >= card.thresholds.green) return "green";
  return "below";
}

/** Which scorecard grades a call type. `null` means the call isn't scored. */
export function scorecardFor(callType: CallType): ScorecardId | null {
  switch (callType) {
    case "new_customer":
      return "sales";
    case "retention":
      return "retention";
    case "scheduling":
    case "billing":
    case "reservice":
      return "all_calls";
    case "other":
      return null;
  }
}
