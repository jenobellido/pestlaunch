import { getScorecardResult, type Grade } from "@/modules/scorecards";
import { cn } from "@/shared/lib/cn";

const GRADE: Record<Grade, { label: string; dot: string }> = {
  gold: { label: "Gold Standard", dot: "bg-orange" },
  green: { label: "Green Standard", dot: "bg-success" },
  below: { label: "Below Standard", dot: "bg-danger" },
};

/** A call's points and grade, compact enough for a row in the call library. */
export function ScoreBadge({ analyses }: { analyses: Record<string, unknown> }) {
  const result = getScorecardResult(analyses);
  if (!result) return <span className="text-sm text-muted">Not scored</span>;
  const grade = GRADE[result.grade];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm tabular-nums" title={grade.label}>
      <span className={cn("size-2 rounded-full", grade.dot)} aria-hidden />
      <span className="font-medium">{result.points}</span>
      <span className="text-muted">/{result.maxPoints}</span>
      <span className="sr-only">, {grade.label}</span>
    </span>
  );
}
