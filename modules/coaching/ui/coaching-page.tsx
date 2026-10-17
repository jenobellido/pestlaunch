import Link from "next/link";
import { ChevronRight, MessageSquareText, Target, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Card, CardTitle, EmptyState } from "@/shared/ui/card";
import { PageHeader, PageStack } from "@/shared/ui/page-header";
import { summarizeTeam, type CoachingCall, type EmployeeSummary } from "../model/team";

const GRADE_DOT = { gold: "bg-orange", green: "bg-success", below: "bg-danger" } as const;
const GRADE_LABEL = { gold: "Gold", green: "Green", below: "Below" } as const;

function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function scoreTone(score: number) {
  return score >= 90 ? "bg-orange" : score >= 75 ? "bg-success" : "bg-danger";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-[28px] bg-card p-4 sm:p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-medium tabular-nums sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted">Not enough calls for a trend</span>;
  const rounded = Math.round(value);
  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        rounded > 0 ? "text-accent" : rounded < 0 ? "text-danger" : "text-muted",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {rounded > 0 ? "+" : ""}
      {rounded} pts vs earlier calls
    </span>
  );
}

function EmployeeCard({ employee, action }: { employee: EmployeeSummary; action?: React.ReactNode }) {
  const score = employee.averageScore;
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent">
          {initialsOf(employee.name)}
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate">{employee.name}</CardTitle>
          <p className="text-xs text-muted">
            {employee.calls.length} {employee.calls.length === 1 ? "call" : "calls"} · {employee.scoredCalls} scored
          </p>
        </div>
        {score !== null && (
          <div className="text-right">
            <p className="text-2xl font-medium tabular-nums">
              {Math.round(score)}
              <span className="text-sm text-muted">%</span>
            </p>
            <p className="text-xs text-muted">avg score</p>
          </div>
        )}
      </div>

      {score !== null && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-inset">
            <div className={cn("bar-grow h-full rounded-full", scoreTone(score))} style={{ width: `${score}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Trend value={employee.trend} />
            <span className="flex gap-3 text-xs text-muted">
              {(["gold", "green", "below"] as const).map((g) => (
                <span key={g} className="inline-flex items-center gap-1.5 tabular-nums">
                  <span className={cn("size-1.5 rounded-full", GRADE_DOT[g])} aria-hidden />
                  {employee.grades[g]} {GRADE_LABEL[g]}
                </span>
              ))}
            </span>
          </div>
        </div>
      )}

      {employee.latestFocus && (
        <div className="flex gap-3 rounded-2xl bg-accent/10 px-4 py-3">
          <Target className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <div className="text-sm">
            <p className="text-xs font-medium text-accent">Focus for the next call</p>
            <p className="mt-0.5">{employee.latestFocus}</p>
          </div>
        </div>
      )}

      {employee.topMissed.length > 0 && (
        <div>
          <p className="text-xs text-muted">Most-missed steps</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {employee.topMissed.map((m) => (
              <li key={m.item} className="flex items-center justify-between gap-3">
                <span className="truncate">{m.item}</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  missed on {m.count} of {employee.scoredCalls}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {action}

      <div className="mt-auto">
        <p className="text-xs text-muted">Recent calls</p>
        <ul className="-mx-2 mt-1">
          {employee.calls.slice(0, 4).map((c) => (
            <li key={c.id}>
              <Link
                href={c.href}
                className="group flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-card-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{c.title}</span>
                  <span className="block text-xs text-muted">
                    {[c.callType, formatDate(c.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {c.score ? (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <span className={cn("size-2 rounded-full", GRADE_DOT[c.score.grade])} aria-hidden />
                    {c.score.points}
                    <span className="text-muted">/{c.score.maxPoints}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted">Not scored</span>
                )}
                <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/**
 * Team coaching: per-employee scores, trends, most-missed steps and the current focus.
 * `plays` and `employeeAction` are slots the app layer fills (assigning coaching plays needs
 * server actions, which live there).
 */
export function CoachingPage({
  calls,
  plays,
  employeeAction,
}: {
  calls: CoachingCall[];
  plays?: React.ReactNode;
  employeeAction?: (employee: EmployeeSummary) => React.ReactNode;
}) {
  const team = summarizeTeam(calls);
  const scored = calls.filter((c) => c.score);
  const teamAverage = scored.length
    ? scored.reduce((sum, c) => sum + c.score!.points / Math.max(c.score!.maxPoints, 1), 0) / scored.length
    : null;

  const missed = new Map<string, number>();
  for (const c of scored) for (const item of new Set(c.score!.missed)) missed.set(item, (missed.get(item) ?? 0) + 1);
  const [teamTopMiss] = [...missed].sort((a, b) => b[1] - a[1]);

  return (
    <PageStack>
      <PageHeader
        title="Coaching"
        description="How each employee is doing on the call process, and what to work on next."
        icon={MessageSquareText}
      />
      {calls.length === 0 && plays}
      {calls.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No reviewed calls yet" className="min-h-80">
          Once calls are processed, each employee&apos;s scores, trends and coaching show up here.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Stat label="Employees" value={String(team.length)} />
            <Stat label="Calls reviewed" value={String(calls.length)} hint={`${scored.length} scored`} />
            <Stat
              label="Team average"
              value={teamAverage === null ? "—" : `${Math.round(teamAverage * 100)}%`}
              hint="of scorecard points"
            />
            <Stat
              label="Most-missed step"
              value={teamTopMiss ? `${teamTopMiss[1]} of ${scored.length}` : "—"}
              hint={teamTopMiss ? teamTopMiss[0] : "No scored calls yet"}
            />
          </div>
          {plays}
          <div className="grid items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {team.map((employee) => (
              <EmployeeCard
                key={`${employee.name}-${employee.calls[0]?.id}`}
                employee={employee}
                action={employeeAction?.(employee)}
              />
            ))}
          </div>
        </>
      )}
    </PageStack>
  );
}
