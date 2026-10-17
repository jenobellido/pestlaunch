import { PageHeader } from "@/shared/ui/page-header";
import { SCORECARDS } from "../config/scorecards";
import { maxPoints } from "../model/grade";

export function ScorecardsPage() {
  return (
    <>
      <PageHeader title="Scorecards" />
      <div className="grid gap-8 md:grid-cols-3">
        {Object.values(SCORECARDS).map((card) => (
          <section key={card.id}>
            <h2 className="font-semibold">{card.name}</h2>
            <p className="mb-3 text-sm text-zinc-500">
              Gold {card.thresholds.gold}/{maxPoints(card)} · Green {card.thresholds.green}+
            </p>
            {card.sections.map((s) => (
              <div key={s.title} className="mb-3 text-sm">
                <p className="font-medium">{s.title}</p>
                <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
