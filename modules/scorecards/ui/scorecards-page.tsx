import { Check, ClipboardCheck } from "lucide-react";
import { Badge, Card, CardTitle } from "@/shared/ui/card";
import { PageHeader, PageStack } from "@/shared/ui/page-header";
import { SCORECARDS } from "../config/scorecards";
import { maxPoints } from "../model/grade";

export function ScorecardsPage() {
  return (
    <PageStack>
      <PageHeader
        title="Scorecards"
        description="What every call is graded against, from the PestLaunch call manuals."
        icon={ClipboardCheck}
      />
      <div className="grid items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {Object.values(SCORECARDS).map((card) => (
          <Card key={card.id}>
            <CardTitle>{card.name}</CardTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge dot="bg-orange">
                Gold {card.thresholds.gold}/{maxPoints(card)}
              </Badge>
              <Badge dot="bg-accent">Green {card.thresholds.green}+</Badge>
            </div>
            <div className="mt-6 space-y-5">
              {card.sections.map((s) => (
                <div key={s.title}>
                  <p className="text-xs text-muted">{s.title}</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {s.items.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                        <span className="text-fg/90">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageStack>
  );
}
