import Link from "next/link";
import { Check, ClipboardCheck, Settings2 } from "lucide-react";
import type { CallTypeDefinition, ScorecardDefinition } from "@/core/calls";
import { Badge, Card, CardTitle } from "@/shared/ui/card";
import { PageHeader, PageStack } from "@/shared/ui/page-header";
import { maxPoints } from "../model/grade";

/** Each distinct scorecard once, with the call types it grades. */
function scorecardsOf(types: readonly CallTypeDefinition[]) {
  const byId = new Map<string, { card: ScorecardDefinition; types: string[] }>();
  for (const t of types) {
    if (!t.scorecard || !t.enabled) continue;
    const entry = byId.get(t.scorecard.id) ?? { card: t.scorecard, types: [] };
    entry.types.push(t.name);
    byId.set(t.scorecard.id, entry);
  }
  return [...byId.values()];
}

/** The company's scorecards: what every call is graded against, and which call types use each. */
export function ScorecardsPage({ types, editHref }: { types: readonly CallTypeDefinition[]; editHref?: string }) {
  const cards = scorecardsOf(types);
  return (
    <PageStack>
      <PageHeader
        title="Scorecards"
        description="What every call is graded against. Each call is scored with its call type's scorecard."
        icon={ClipboardCheck}
        actions={
          editHref && (
            <Link
              href={editHref}
              className="press inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm hover:bg-card"
            >
              <Settings2 className="size-4" aria-hidden />
              Edit call types
            </Link>
          )
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {cards.map(({ card, types: usedBy }) => (
          <Card key={card.id}>
            <CardTitle>{card.name}</CardTitle>
            <p className="mt-1 text-sm text-muted">Used for {usedBy.join(", ")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge dot="bg-orange">
                Gold {card.thresholds.gold}/{maxPoints(card)}
              </Badge>
              <Badge dot="bg-success">Green {card.thresholds.green}+</Badge>
            </div>
            <div className="mt-6 space-y-5">
              {card.sections.map((s) => (
                <div key={s.title}>
                  <p className="text-xs text-muted">
                    {s.title}
                    {s.autoAwardWhenNotApplicable && " · awarded automatically when there are no objections"}
                  </p>
                  <ul className="mt-2 space-y-3 text-sm">
                    {s.items.map((item) => (
                      <li key={item.name} className="flex gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-fg/90">{item.name}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{item.criteria}</span>
                        </span>
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
