import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  Flag,
  Phone,
  ShieldCheck,
  Star,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Card, CardTitle, EmptyState } from "@/shared/ui/card";
import { RANGES, type Insights, type LeakKind, type Range } from "../_lib/insights";
import { AssignTask, TasksCard, type Assignee, type TaskRow } from "./tasks";

const LEAK_STYLE: Record<LeakKind, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  sale_not_closed: { icon: CircleDollarSign, tone: "bg-orange/15 text-orange" },
  cancelled: { icon: TrendingDown, tone: "bg-danger/15 text-danger" },
  follow_up: { icon: Flag, tone: "bg-sky/15 text-sky" },
  below_standard: { icon: AlertTriangle, tone: "bg-danger/10 text-danger" },
};

const GRADE_DOT = { gold: "bg-orange", green: "bg-success", below: "bg-danger" } as const;

function formatTalk(totalSec: number) {
  const minutes = Math.round(totalSec / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

const percent = (value: number | null) => (value === null ? "–" : `${Math.round(value)}%`);

function rateTone(value: number | null, good: number, ok: number) {
  if (value === null) return "text-fg";
  return value >= good ? "text-success" : value >= ok ? "text-orange" : "text-danger";
}

export function RangeChips({ base, range }: { base: string; range: Range }) {
  return (
    <nav aria-label="Date range" className="inline-flex rounded-full bg-card p-1">
      {RANGES.map((r) => (
        <Link
          key={r.id}
          href={r.id === "7d" ? base : `${base}?range=${r.id}`}
          aria-current={range === r.id ? "page" : undefined}
          className={cn(
            "press rounded-full px-3.5 py-1.5 text-sm transition-colors",
            range === r.id ? "bg-accent font-medium text-accent-ink" : "text-muted hover:text-fg",
          )}
        >
          {r.label}
        </Link>
      ))}
    </nav>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  valueClass,
  hint,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass?: string;
  hint: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 bg-card px-5 py-4", className)}>
      <dt className="flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="min-w-0">
        <span className={cn("block text-2xl font-medium tabular-nums", valueClass)}>{value}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{hint}</span>
      </dd>
    </div>
  );
}

export function Overview({
  insights,
  slug,
  mine,
  tasks,
  members,
  currentUserId,
}: {
  insights: Insights;
  slug: string;
  mine: boolean;
  tasks: TaskRow[];
  /** Teammates to assign leaks to; only for viewers with "calls.assign". */
  members: Assignee[] | null;
  currentUserId: string;
}) {
  // A leak with an open task shows who owns it instead of the Assign control.
  const ownerByCall = new Map(tasks.filter((t) => t.status === "open").map((t) => [t.callId, t.assigneeName]));
  const tasksCard = (
    <TasksCard slug={slug} tasks={tasks} canManage={members !== null} currentUserId={currentUserId} />
  );
  const { totals, sales, retention, quality, leaks, reps } = insights;

  if (totals.calls === 0) {
    return (
      <>
      {tasks.length > 0 && tasksCard}
      <EmptyState icon={Phone} title="No calls in this period" className="min-h-80">
        <p>Upload call recordings and this page fills with close rates, saved cancels, follow-ups and scores.</p>
        <Link href={`/${slug}/calls`} className="mt-4 inline-flex items-center gap-1 font-medium text-accent hover:underline">
          Go to Calls <ArrowRight className="size-4" aria-hidden />
        </Link>
      </EmptyState>
      </>
    );
  }

  return (
    <>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] bg-line lg:grid-cols-5">
        <Tile icon={Phone} label="Calls" value={String(totals.analyzed)} hint={`${formatTalk(totals.talkTimeSec)} talk time`} />
        <Tile
          icon={CircleDollarSign}
          label="Close rate"
          value={percent(sales.closeRate)}
          valueClass={rateTone(sales.closeRate, 60, 35)}
          hint={sales.calls ? `${sales.closed} of ${sales.calls} sales calls booked` : "No sales calls"}
        />
        <Tile
          icon={ShieldCheck}
          label="Cancels saved"
          value={percent(retention.saveRate)}
          valueClass={rateTone(retention.saveRate, 50, 25)}
          hint={retention.calls ? `${retention.saved} of ${retention.calls} saved` : "No cancel calls"}
        />
        <Tile icon={Flag} label="Follow-ups open" value={String(insights.followUpsOpen)} hint="Callers waiting on us" />
        <Tile
          icon={Star}
          label="Avg score"
          className="col-span-2 lg:col-span-1"
          value={percent(quality.averageScore)}
          valueClass={rateTone(quality.averageScore, 90, 75)}
          hint={
            <span className="inline-flex gap-2">
              {(["gold", "green", "below"] as const).map((g) => (
                <span key={g} className="inline-flex items-center gap-1 tabular-nums">
                  <span className={cn("size-1.5 rounded-full", GRADE_DOT[g])} aria-hidden />
                  {quality.grades[g]}
                  <span className="sr-only"> {g}</span>
                </span>
              ))}
            </span>
          }
        />
      </dl>

      {(totals.processing > 0 || totals.failed > 0) && (
        <p className="text-sm text-muted">
          {totals.processing > 0 && `${totals.processing} still processing. `}
          {totals.failed > 0 && (
            <Link href={`/${slug}/calls`} className="text-danger hover:underline">
              {totals.failed} failed to process
            </Link>
          )}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-0 sm:p-0">
          <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
            <div>
              <CardTitle>Leaks</CardTitle>
              <p className="text-sm text-muted">Calls that lost money or still need someone to act.</p>
            </div>
            <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium tabular-nums">{leaks.length}</span>
          </div>
          {leaks.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted">No leaks in this period. Nice work.</p>
          ) : (
            <ul className="mt-3">
              {leaks.slice(0, 8).map(({ call, kind, label, detail }) => {
                const { icon: Icon, tone } = LEAK_STYLE[kind];
                const owner = ownerByCall.get(call.id);
                return (
                  <li key={call.id} className="flex items-center gap-2 border-t border-line pr-4 transition-colors hover:bg-card-2 sm:pr-5">
                    <Link
                      href={call.href}
                      className="group flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-5 sm:pl-6"
                    >
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone)}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2 text-sm">
                          <span className="shrink-0 font-medium whitespace-nowrap">{label}</span>
                          <span className="min-w-0 truncate text-muted">
                            · {call.title}
                            {call.employeeName && ` · ${call.employeeName}`}
                          </span>
                        </span>
                        <span className="block truncate text-sm text-muted">{detail}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                    {owner ? (
                      <span className="max-w-28 shrink-0 truncate rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                        {owner.split(/\s+/)[0]}
                      </span>
                    ) : (
                      members && (
                        <AssignTask slug={slug} callId={call.id} title={`${label}: ${detail}`.slice(0, 200)} members={members} />
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {leaks.length > 8 && (
            <Link
              href={`/${slug}/calls`}
              className="flex items-center justify-center gap-1 border-t border-line px-6 py-3 text-sm text-muted hover:text-fg"
            >
              See all calls <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          {tasksCard}
          {!mine && reps.length > 0 && (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Reps</CardTitle>
                <Link href={`/${slug}/team`} className="text-sm text-muted hover:text-fg">
                  Team <ArrowRight className="inline size-3.5" aria-hidden />
                </Link>
              </div>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-2 font-normal">Rep</th>
                    <th className="pb-2 text-right font-normal">Calls</th>
                    <th className="pb-2 text-right font-normal">Close</th>
                    <th className="pb-2 text-right font-normal">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {reps.slice(0, 6).map((r) => (
                    <tr key={r.key} className="border-t border-line">
                      <td className="max-w-0 truncate py-2.5 pr-3">{r.name}</td>
                      <td className="py-2.5 text-right tabular-nums">{r.calls}</td>
                      <td className={cn("py-2.5 text-right tabular-nums", rateTone(r.closeRate, 60, 35))}>
                        {percent(r.closeRate)}
                      </td>
                      <td className={cn("py-2.5 text-right tabular-nums", rateTone(r.averageScore, 90, 75))}>
                        {percent(r.averageScore)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <Card>
            <CardTitle>Why customers cancel</CardTitle>
            {retention.calls === 0 ? (
              <p className="mt-2 text-sm text-muted">No cancel calls in this period.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {retention.reasons.map((r) => (
                  <li key={r.reason} className="text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate">{r.reason}</span>
                      <span className="shrink-0 text-xs text-muted tabular-nums">
                        {r.saved} of {r.total} saved
                      </span>
                    </div>
                    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-inset">
                      <div className="bar-grow h-full bg-success" style={{ width: `${(r.saved / r.total) * 100}%` }} />
                      <div className="h-full bg-danger/70" style={{ width: `${((r.total - r.saved) / r.total) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
