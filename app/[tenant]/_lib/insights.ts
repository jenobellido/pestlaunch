import type { CallTypeGroup } from "@/modules/calls";

// Pure dashboard maths for the Overview, kept apart from the page so it's easy to test.
// The app layer builds DashboardCalls from the calls and scorecards modules.

export type Range = "7d" | "30d" | "all";
export const RANGES: { id: Range; label: string; days: number | null }[] = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "all", label: "All time", days: null },
];

export function parseRange(value: string | string[] | undefined): Range {
  return value === "30d" || value === "all" ? value : "7d";
}

export interface DashboardCall {
  id: string;
  href: string;
  title: string;
  typeLabel: string | null;
  group: CallTypeGroup | null;
  employeeId: string | null;
  employeeName: string | null;
  createdAt: string;
  durationSec: number;
  status: "processing" | "ready" | "failed";
  resolution: string | null;
  followUps: string[];
  /** Why the customer wanted to cancel, for retention calls (e.g. "Price"). */
  cancelReason: string | null;
  score: { points: number; maxPoints: number; grade: "gold" | "green" | "below" } | null;
}

export type LeakKind = "sale_not_closed" | "cancelled" | "follow_up" | "below_standard";

const LEAK_ORDER: Record<LeakKind, number> = { sale_not_closed: 0, cancelled: 1, follow_up: 2, below_standard: 3 };

export interface Leak {
  call: DashboardCall;
  kind: LeakKind;
  label: string;
  detail: string;
}

export interface RepStats {
  key: string;
  name: string;
  calls: number;
  salesCalls: number;
  closeRate: number | null;
  averageScore: number | null;
}

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null);
const scorePct = (s: NonNullable<DashboardCall["score"]>) => (s.points / Math.max(s.maxPoints, 1)) * 100;

export function inRange(calls: DashboardCall[], range: Range, now = Date.now()) {
  const days = RANGES.find((r) => r.id === range)?.days;
  if (!days) return calls;
  const since = now - days * 24 * 60 * 60 * 1000;
  return calls.filter((c) => new Date(c.createdAt).getTime() >= since);
}

/** What went wrong or is still open on each call, most urgent first. A call can leak once. */
function leakFor(call: DashboardCall): Leak | null {
  if (call.status !== "ready") return null;
  if (call.group === "sales" && call.resolution !== "booked") {
    return {
      call,
      kind: "sale_not_closed",
      label: "Sale not closed",
      detail: call.followUps[0] ?? "The caller didn't book. Worth a call back.",
    };
  }
  if (call.group === "retention" && call.resolution === "cancelled") {
    return {
      call,
      kind: "cancelled",
      label: "Customer cancelled",
      detail: call.cancelReason ? `Reason: ${call.cancelReason}` : "The customer wasn't saved.",
    };
  }
  if (call.resolution === "follow_up_needed" || call.resolution === "unresolved") {
    return {
      call,
      kind: "follow_up",
      label: "Follow-up owed",
      detail: call.followUps[0] ?? "The caller's request wasn't finished on the call.",
    };
  }
  if (call.score?.grade === "below") {
    return {
      call,
      kind: "below_standard",
      label: "Below standard",
      detail: `Scored ${call.score.points}/${call.score.maxPoints} on the call process.`,
    };
  }
  return null;
}

export function summarize(calls: DashboardCall[]) {
  const ready = calls.filter((c) => c.status === "ready");
  const sales = ready.filter((c) => c.group === "sales");
  const closed = sales.filter((c) => c.resolution === "booked");
  const retention = ready.filter((c) => c.group === "retention");
  const saved = retention.filter((c) => c.resolution === "retained");
  const scored = ready.filter((c) => c.score);
  const followUps = ready.filter((c) => c.resolution === "follow_up_needed" || c.followUps.length > 0);

  const scores = scored.map((c) => scorePct(c.score!));
  const averageScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // Cancel reasons, most common first.
  const reasons = new Map<string, { total: number; saved: number }>();
  for (const c of retention) {
    const reason = c.cancelReason ?? "Not given";
    const r = reasons.get(reason) ?? { total: 0, saved: 0 };
    r.total++;
    if (c.resolution === "retained") r.saved++;
    reasons.set(reason, r);
  }

  // Per rep, by assigned member, else by the name heard in the call.
  const reps = new Map<string, RepStats & { scoreSum: number; scored: number; closed: number }>();
  for (const c of ready) {
    const name = c.employeeName?.trim() || "Unassigned";
    const key = c.employeeId ?? `heard:${name.toLowerCase()}`;
    const r = reps.get(key) ?? {
      key,
      name,
      calls: 0,
      salesCalls: 0,
      closeRate: null,
      averageScore: null,
      scoreSum: 0,
      scored: 0,
      closed: 0,
    };
    r.calls++;
    if (c.group === "sales") {
      r.salesCalls++;
      if (c.resolution === "booked") r.closed++;
    }
    if (c.score) {
      r.scoreSum += scorePct(c.score);
      r.scored++;
    }
    reps.set(key, r);
  }

  // Lost money first (unclosed sales, cancellations), then callers waiting on us, then quality.
  const leaks = ready
    .map(leakFor)
    .filter((l): l is Leak => l !== null)
    .sort((a, b) => LEAK_ORDER[a.kind] - LEAK_ORDER[b.kind] || b.call.createdAt.localeCompare(a.call.createdAt));

  return {
    totals: {
      calls: calls.length,
      analyzed: ready.length,
      processing: calls.filter((c) => c.status === "processing").length,
      failed: calls.filter((c) => c.status === "failed").length,
      talkTimeSec: ready.reduce((sum, c) => sum + c.durationSec, 0),
    },
    sales: { calls: sales.length, closed: closed.length, closeRate: pct(closed.length, sales.length) },
    retention: {
      calls: retention.length,
      saved: saved.length,
      saveRate: pct(saved.length, retention.length),
      reasons: [...reasons].map(([reason, r]) => ({ reason, ...r })).sort((a, b) => b.total - a.total),
    },
    followUpsOpen: followUps.length,
    quality: {
      scored: scored.length,
      averageScore,
      grades: {
        gold: scored.filter((c) => c.score!.grade === "gold").length,
        green: scored.filter((c) => c.score!.grade === "green").length,
        below: scored.filter((c) => c.score!.grade === "below").length,
      },
    },
    leaks,
    reps: [...reps.values()]
      .map(({ scoreSum, scored: n, closed: won, ...r }) => ({
        ...r,
        closeRate: pct(won, r.salesCalls),
        averageScore: n ? scoreSum / n : null,
      }))
      .sort((a, b) => b.calls - a.calls),
  };
}

export type Insights = ReturnType<typeof summarize>;
