import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ChevronRight, Lightbulb, Target, UserRound } from "lucide-react";
import { z } from "zod";
import { can, listMembers } from "@/core/tenancy";
import { CALL_TYPE_LABELS } from "@/modules/calls";
import { listCalls, listTasks } from "@/modules/calls/server";
import { getCoachingFeedback } from "@/modules/coaching";
import { listPlays } from "@/modules/coaching/server";
import { getScorecardResult, stepCriteria } from "@/modules/scorecards";
import { cn } from "@/shared/lib/cn";
import { Card, CardTitle, EmptyState } from "@/shared/ui/card";
import { Bone, PageHeader, PageStack } from "@/shared/ui/page-header";
import { TasksCard } from "../../_components/tasks";
import { requireModule } from "../../_lib/require-module";
import { PlaysCard } from "../_components/plays";

const GRADE_BAR = { gold: "bg-orange", green: "bg-success", below: "bg-danger" } as const;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function tone(value: number | null, good: number, ok: number) {
  if (value === null) return "";
  return value >= good ? "text-success" : value >= ok ? "text-orange" : "text-danger";
}

function Tile({ label, value, hint, className }: { label: string; value: string; hint: string; className?: string }) {
  return (
    <div className="min-w-0 bg-card px-5 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd>
        <span className={cn("block text-2xl font-medium tabular-nums", className)}>{value}</span>
        <span className="block truncate text-xs text-muted">{hint}</span>
      </dd>
    </div>
  );
}

async function RepBody({ params }: { params: PageProps<"/[tenant]/team/[repId]">["params"] }) {
  const access = await requireModule(params, "coaching");
  const { tenant, user } = access;
  const { repId } = await params;
  // Everyone can see their own page; other reps' pages need "calls.view_all".
  if (!z.uuid().safeParse(repId).success || (repId !== user.id && !can(access, "calls.view_all"))) notFound();

  const member = (await listMembers(tenant.id)).find((m) => m.userId === repId);
  if (!member) notFound();

  const [calls, plays, tasks] = await Promise.all([
    listCalls(tenant.slug, { employeeId: repId }),
    listPlays(tenant.id, { assigneeId: repId }),
    listTasks(tenant.id, { assigneeId: repId }),
  ]);
  const ready = calls.filter((c) => c.status === "ready");
  const scored = ready
    .map((c) => ({ call: c, score: getScorecardResult(c.analyses) }))
    .filter((s): s is { call: (typeof ready)[number]; score: NonNullable<ReturnType<typeof getScorecardResult>> } => !!s.score);

  const scorePcts = scored.map((s) => (s.score.points / Math.max(s.score.maxPoints, 1)) * 100);
  const average = scorePcts.length ? Math.round(scorePcts.reduce((a, b) => a + b, 0) / scorePcts.length) : null;
  // Newer half of scored calls against the older half (lists are newest first).
  // Needs at least 4 scored calls (2 per half) to mean anything.
  const half = Math.floor(scorePcts.length / 2);
  const trend =
    half >= 2
      ? Math.round(
          scorePcts.slice(0, half).reduce((a, b) => a + b, 0) / half -
            scorePcts.slice(-half).reduce((a, b) => a + b, 0) / half,
        )
      : null;

  const sales = ready.filter((c) => c.callType === "new_customer");
  const retention = ready.filter((c) => c.callType === "retention");
  const closeRate = pct(sales.filter((c) => c.outcome?.resolution === "booked").length, sales.length);
  const saveRate = pct(retention.filter((c) => c.outcome?.resolution === "retained").length, retention.length);

  // Steps missed most, per scorecard and section, with what the manual asks for.
  const steps = new Map<string, { item: string; criteria: string | null; missed: number; of: number; card: string }>();
  for (const { score } of scored) {
    for (const i of score.items) {
      const key = `${score.scorecardId}|${i.section}|${i.item}`;
      const s = steps.get(key) ?? {
        item: i.item,
        criteria: stepCriteria(score.scorecardId, i.section, i.item),
        missed: 0,
        of: 0,
        card: score.scorecardId,
      };
      s.of++;
      if (!i.passed) s.missed++;
      steps.set(key, s);
    }
  }
  const workOn = [...steps.values()].filter((s) => s.missed > 0).sort((a, b) => b.missed / b.of - a.missed / a.of || b.missed - a.missed).slice(0, 4);

  const coached = ready.find((c) => getCoachingFeedback(c.analyses));
  const coaching = coached ? getCoachingFeedback(coached.analyses) : undefined;
  const chart = scored.slice(0, 12).reverse();
  const canManagePlays = can(access, "coaching.manage");

  return (
    <PageStack>
      <Link href={`/${tenant.slug}/team`} className="press inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        Team
      </Link>
      <PageHeader
        title={member.displayName}
        description={`${member.role.name} · ${ready.length} ${ready.length === 1 ? "call" : "calls"} reviewed${
          ready[0] ? ` · last call ${formatDate(ready[0].createdAt)}` : ""
        }`}
        icon={UserRound}
      />

      {ready.length === 0 ? (
        <EmptyState icon={UserRound} title="No calls yet" className="min-h-64">
          Calls assigned to {member.displayName.split(/\s+/)[0]} show up here with their scores and coaching.
        </EmptyState>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] bg-line lg:grid-cols-4">
            <Tile label="Avg score" value={average === null ? "–" : `${average}%`} hint={`${scored.length} scored calls`} className={tone(average, 90, 75)} />
            <Tile
              label="Trend"
              value={trend === null ? "–" : `${trend > 0 ? "+" : ""}${trend} pts`}
              hint={trend === null ? "Needs 4 scored calls" : "Newer calls vs older ones"}
              className={trend === null ? "" : trend > 0 ? "text-success" : trend < 0 ? "text-danger" : ""}
            />
            <Tile
              label="Close rate"
              value={closeRate === null ? "–" : `${closeRate}%`}
              hint={sales.length ? `${sales.length} sales calls` : "No sales calls"}
              className={tone(closeRate, 60, 35)}
            />
            <Tile
              label="Cancels saved"
              value={saveRate === null ? "–" : `${saveRate}%`}
              hint={retention.length ? `${retention.length} cancel calls` : "No cancel calls"}
              className={tone(saveRate, 50, 25)}
            />
          </dl>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-6">
              <Card>
                <CardTitle>What to work on</CardTitle>
                <p className="text-sm text-muted">The steps missed most often, and what good sounds like.</p>
                {workOn.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">Nothing missed on scored calls. Great work.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {workOn.map((s) => (
                      <li key={`${s.card}-${s.item}`} className="rounded-2xl bg-chip px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-medium">{s.item}</p>
                          <span className="shrink-0 text-xs text-muted tabular-nums">
                            missed on {s.missed} of {s.of}
                          </span>
                        </div>
                        {s.criteria && (
                          <p className="mt-1.5 flex gap-2 text-sm text-fg/85">
                            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                            {s.criteria}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {chart.length > 1 && (
                <Card>
                  <CardTitle>Score by call</CardTitle>
                  <p className="text-sm text-muted">Oldest on the left. Click a bar to open the call.</p>
                  <div className="mt-4 flex h-36 items-end gap-2" role="list" aria-label="Score by call">
                    {chart.map(({ call, score }) => {
                      const value = Math.round((score.points / Math.max(score.maxPoints, 1)) * 100);
                      return (
                        <Link
                          key={call.id}
                          role="listitem"
                          href={`/${tenant.slug}/calls/${call.id}`}
                          title={`${call.fileName.replace(/\.[^.]+$/, "")}: ${score.points}/${score.maxPoints}`}
                          className="group flex h-full max-w-14 min-w-0 flex-1 flex-col justify-end"
                        >
                          <span className="mb-1 text-center text-[10px] text-muted tabular-nums">{value}%</span>
                          <span
                            className={cn("block rounded-t-lg transition-opacity group-hover:opacity-80", GRADE_BAR[score.grade])}
                            style={{ height: `${Math.max(value, 4)}%` }}
                          />
                          <span className="mt-1 truncate text-center text-[10px] text-muted">{formatDate(call.createdAt)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-6">
              {coaching && (
                <Card>
                  <CardTitle>Latest coaching</CardTitle>
                  <div className="mt-3 flex gap-3 rounded-2xl bg-accent/10 px-4 py-3">
                    <Target className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                    <div className="text-sm">
                      <p className="text-xs font-medium text-accent">Focus for the next call</p>
                      <p className="mt-0.5">{coaching.focus}</p>
                    </div>
                  </div>
                  {coaching.improvements[0] && (
                    <p className="mt-3 text-sm text-fg/85">
                      <span className="font-medium text-accent">Try saying: </span>
                      {coaching.improvements[0].suggestion}
                    </p>
                  )}
                  <Link href={`/${tenant.slug}/calls/${coached!.id}`} className="mt-3 inline-block text-xs text-muted hover:text-fg hover:underline">
                    From {coached!.fileName.replace(/\.[^.]+$/, "")}
                  </Link>
                </Card>
              )}
              <PlaysCard
                slug={tenant.slug}
                plays={plays}
                canManage={canManagePlays}
                currentUserId={user.id}
                heading={
                  repId === user.id
                    ? undefined
                    : { title: "Plays", description: `Coaching assigned to ${member.displayName.split(/\s+/)[0]}.` }
                }
              />
              <TasksCard
                slug={tenant.slug}
                tasks={tasks}
                canManage={can(access, "calls.assign")}
                currentUserId={user.id}
                heading={
                  repId === user.id
                    ? undefined
                    : { title: "Follow-up tasks", description: `Calls ${member.displayName.split(/\s+/)[0]} has been asked to follow up on.` }
                }
              />
              <Card className="p-0 sm:p-0">
                <CardTitle className="px-5 pt-5 sm:px-6 sm:pt-6">Recent calls</CardTitle>
                <ul className="mt-2">
                  {ready.slice(0, 6).map((c) => {
                    const score = getScorecardResult(c.analyses);
                    return (
                      <li key={c.id} className="border-t border-line">
                        <Link href={`/${tenant.slug}/calls/${c.id}`} className="group flex items-center gap-3 px-5 py-3 hover:bg-card-2 sm:px-6">
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="block truncate">{c.fileName.replace(/\.[^.]+$/, "")}</span>
                            <span className="block text-xs text-muted">
                              {[c.callType && CALL_TYPE_LABELS[c.callType], formatDate(c.createdAt)].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          {score && (
                            <span className="text-sm tabular-nums">
                              {score.points}
                              <span className="text-muted">/{score.maxPoints}</span>
                            </span>
                          )}
                          <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          </div>
        </>
      )}
    </PageStack>
  );
}

export default function RepPage({ params }: PageProps<"/[tenant]/team/[repId]">) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Bone className="h-12 w-64 rounded-2xl" />
          <Bone className="h-24 rounded-[28px]" />
          <Bone className="h-96 rounded-[28px]" />
        </div>
      }
    >
      <RepBody params={params} />
    </Suspense>
  );
}
