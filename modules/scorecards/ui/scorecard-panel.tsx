import { SCORECARDS } from "../config/scorecards";
import type { ScorecardResult } from "../model/types";

const GRADE_LABEL = { gold: "Gold Standard", green: "Green Standard", below: "Below Standard" };

export function ScorecardPanel({ result }: { result: ScorecardResult | null | undefined }) {
  if (!result) return <p className="text-sm text-zinc-500">This call type isn&apos;t scored.</p>;
  return (
    <section>
      <h2 className="font-semibold">{SCORECARDS[result.scorecardId].name}</h2>
      <p className="text-2xl font-semibold tabular-nums">
        {result.points}/{result.maxPoints}{" "}
        <span className="text-base font-normal">{GRADE_LABEL[result.grade]}</span>
      </p>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {result.items.map((i) => (
          <li key={`${i.section}:${i.item}`}>
            {i.passed ? "✓" : "✗"} {i.item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Reads this module's result from a call's `analyses` map. */
export function getScorecardResult(analyses: Record<string, unknown>) {
  return analyses.scorecards as ScorecardResult | null | undefined;
}
