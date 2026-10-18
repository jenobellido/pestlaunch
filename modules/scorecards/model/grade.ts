import type { CallType } from "@/core/calls";
import type { Grade, Scorecard, ScorecardId } from "./types";

export function maxPoints(card: Scorecard): number {
  return card.sections.reduce((sum, s) => sum + s.items.length, 0);
}

export function gradeFor(card: Pick<Scorecard, "thresholds">, points: number): Grade {
  if (points >= card.thresholds.gold) return "gold";
  if (points >= card.thresholds.green) return "green";
  return "below";
}

/** Which of the manuals' scorecards grades a built-in call type by default. `null` means it isn't scored. */
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
    default:
      return null;
  }
}

/** Why a score should be double-checked: it's one point either side of a grade boundary. */
export function borderlineReason(card: Pick<Scorecard, "thresholds">, points: number): string | null {
  const { gold, green } = card.thresholds;
  if (points === gold - 1) return "One point short of Gold; worth a second look.";
  if (points === green - 1) return "One point short of Green; worth a second look.";
  if (points === green && green !== gold) return "Only just made Green; worth a second look.";
  return null;
}
