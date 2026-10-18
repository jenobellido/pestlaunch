import { Check, ClipboardCheck, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Card, CardTitle } from "@/shared/ui/card";
import { SCORECARDS } from "../config/scorecards";
import type { Grade, ScorecardItemResult, ScorecardResult } from "../model/types";

const GRADE: Record<Grade, { label: string; badge: string; bar: string }> = {
  gold: { label: "Gold Standard", badge: "bg-orange text-on-orange", bar: "bg-orange" },
  green: { label: "Green Standard", badge: "bg-badge-success text-on-badge-success", bar: "bg-success" },
  below: { label: "Below Standard", badge: "bg-badge-danger text-on-badge-danger", bar: "bg-danger" },
};

/**
 * `rubricHref` links to the full scorecard rubric (the Scorecards page). `renderMark` lets the
 * app layer swap each pass/fail mark for a control, e.g. so reviewers can correct a step.
 */
export function ScorecardPanel({
  result,
  rubricHref,
  renderMark,
}: {
  result: ScorecardResult | null | undefined;
  rubricHref?: string;
  renderMark?: (index: number, item: ScorecardItemResult) => React.ReactNode;
}) {
  if (!result)
    return (
      <Card className="flex items-center gap-3">
        <ClipboardCheck className="size-5 text-muted" aria-hidden />
        <p className="text-sm text-muted">This call type isn&apos;t scored.</p>
      </Card>
    );

  const grade = GRADE[result.grade];
  const sections = Map.groupBy(result.items, (i) => i.section);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{SCORECARDS[result.scorecardId].name}</CardTitle>
          {rubricHref && (
            <a href={rubricHref} className="text-xs text-muted hover:text-fg hover:underline">
              How calls are graded
            </a>
          )}
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", grade.badge)}>
          {grade.label}
        </span>
      </div>
      <p className="mt-3 text-4xl font-medium tabular-nums">
        {result.points}
        <span className="text-xl text-muted">/{result.maxPoints}</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-inset">
        <div
          className={cn("bar-grow h-full rounded-full", grade.bar)}
          style={{ width: `${(result.points / Math.max(result.maxPoints, 1)) * 100}%` }}
        />
      </div>
      <div className="mt-6 space-y-5">
        {[...sections].map(([section, items]) => (
          <div key={section}>
            <p className="text-xs text-muted">{section}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.item} className="flex gap-2.5">
                  {renderMark ? (
                    renderMark(result.items.indexOf(i), i)
                  ) : i.passed ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="Passed" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Missed" />
                  )}
                  <span className="min-w-0">
                    <span className={i.passed ? "text-fg/90" : "text-fg"}>{i.item}</span>
                    {i.corrected && (
                      <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-px text-[10px] font-medium text-accent">
                        Corrected
                      </span>
                    )}
                    {i.evidence ? (
                      <span className="mt-0.5 block text-xs text-muted">&ldquo;{i.evidence}&rdquo;</span>
                    ) : (
                      i.reason && <span className="mt-0.5 block text-xs text-muted">{i.reason}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Reads this module's result from a call's `analyses` map. */
export function getScorecardResult(analyses: Record<string, unknown>) {
  return analyses.scorecards as ScorecardResult | null | undefined;
}
