import type { CoachingFeedback } from "../model/types";

export function CoachingPanel({ feedback }: { feedback: CoachingFeedback | undefined }) {
  if (!feedback) return null;
  return (
    <section className="text-sm">
      <h2 className="font-semibold">Coaching</h2>
      <p className="mt-1">
        <span className="font-medium">Focus:</span> {feedback.focus}
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {feedback.improvements.map((p) => (
          <li key={p.point}>
            <p className="font-medium">{p.point}</p>
            {p.quote && <p className="text-zinc-500">&ldquo;{p.quote}&rdquo;</p>}
            <p>Try: {p.suggestion}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function getCoachingFeedback(analyses: Record<string, unknown>) {
  return analyses.coaching as CoachingFeedback | undefined;
}
