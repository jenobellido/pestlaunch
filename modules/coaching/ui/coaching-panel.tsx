import { Target, ThumbsUp } from "lucide-react";
import { Card, CardTitle } from "@/shared/ui/card";
import type { CoachingFeedback } from "../model/types";

export function CoachingPanel({ feedback }: { feedback: CoachingFeedback | undefined }) {
  if (!feedback) return null;
  return (
    <Card>
      <CardTitle>Coaching</CardTitle>
      <div className="mt-4 flex gap-3 rounded-2xl bg-accent/10 px-4 py-3">
        <Target className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <div className="text-sm">
          <p className="text-xs font-medium text-accent">Focus for the next call</p>
          <p className="mt-0.5">{feedback.focus}</p>
        </div>
      </div>

      {feedback.strengths.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-muted">What went well</p>
          <ul className="mt-2 space-y-2 text-sm">
            {feedback.strengths.map((s) => (
              <li key={s} className="flex gap-2.5">
                <ThumbsUp className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span className="text-fg/90">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-muted">To improve</p>
          <ul className="mt-2 space-y-3">
            {feedback.improvements.map((p) => (
              <li key={p.point} className="rounded-2xl bg-chip px-4 py-3 text-sm">
                <p className="font-medium">{p.point}</p>
                {p.quote && <p className="mt-1 text-muted">&ldquo;{p.quote}&rdquo;</p>}
                <p className="mt-2 text-fg/90">
                  <span className="font-medium text-accent">Try: </span>
                  {p.suggestion}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function getCoachingFeedback(analyses: Record<string, unknown>) {
  return (analyses.coaching as CoachingFeedback | null | undefined) ?? undefined;
}
