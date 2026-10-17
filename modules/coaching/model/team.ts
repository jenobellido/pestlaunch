import type { CoachingFeedback } from "./types";

/**
 * A reviewed call as the Coaching page needs it. The app layer builds these from the calls
 * and scorecards modules, so this module never imports them.
 */
export interface CoachingCall {
  id: string;
  href: string;
  title: string;
  /** e.g. "Retention". */
  callType: string | null;
  /** The team member the call belongs to. Calls are grouped by this when it's set. */
  employeeId: string | null;
  employeeName: string | null;
  createdAt: string;
  /** Missing when the call type isn't scored or the scorecards module is off. */
  score?: {
    points: number;
    maxPoints: number;
    grade: "gold" | "green" | "below";
    /** Names of the scorecard items the employee missed. */
    missed: string[];
  };
  coaching?: CoachingFeedback;
}

export interface EmployeeSummary {
  name: string;
  /** The team member, when the group's calls are assigned to one. */
  employeeId: string | null;
  calls: CoachingCall[];
  scoredCalls: number;
  /** Average share of points earned, 0 to 100, across scored calls. Scorecards differ in size. */
  averageScore: number | null;
  /** Average of the newest half of scored calls minus the oldest half, in points out of 100. */
  trend: number | null;
  grades: { gold: number; green: number; below: number };
  /** Scorecard items missed most often, with how many calls missed each. */
  topMissed: { item: string; count: number }[];
  /** The focus from the newest coached call. */
  latestFocus: string | null;
}

const UNKNOWN = "Unknown employee";

const percent = (s: NonNullable<CoachingCall["score"]>) => (s.points / Math.max(s.maxPoints, 1)) * 100;
const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

/**
 * Groups calls by team member, and unassigned calls by the name heard in the call (compared
 * case-insensitively), then summarises each group.
 */
export function summarizeTeam(calls: CoachingCall[]): EmployeeSummary[] {
  const groups = new Map<string, CoachingCall[]>();
  for (const call of calls) {
    const name = call.employeeName?.trim() || UNKNOWN;
    const key = call.employeeId ? `member:${call.employeeId}` : `heard:${name.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), { ...call, employeeName: name }]);
  }

  const summaries = [...groups.values()].map((group): EmployeeSummary => {
    // Newest first for display; oldest first for the trend.
    const newestFirst = [...group].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const scored = [...newestFirst].reverse().filter((c) => c.score);
    const scores = scored.map((c) => percent(c.score!));

    let trend: number | null = null;
    if (scores.length >= 2) {
      const half = Math.floor(scores.length / 2);
      trend = average(scores.slice(-half))! - average(scores.slice(0, half))!;
    }

    const missed = new Map<string, number>();
    for (const c of scored) for (const item of new Set(c.score!.missed)) missed.set(item, (missed.get(item) ?? 0) + 1);

    return {
      name: group[0].employeeName ?? UNKNOWN,
      employeeId: group[0].employeeId,
      calls: newestFirst,
      scoredCalls: scored.length,
      averageScore: average(scores),
      trend,
      grades: {
        gold: scored.filter((c) => c.score!.grade === "gold").length,
        green: scored.filter((c) => c.score!.grade === "green").length,
        below: scored.filter((c) => c.score!.grade === "below").length,
      },
      topMissed: [...missed]
        .map(([item, count]) => ({ item, count }))
        .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item))
        .slice(0, 3),
      latestFocus: newestFirst.find((c) => c.coaching?.focus)?.coaching?.focus ?? null,
    };
  });

  // Most calls first; the unknown group last.
  return summaries.sort(
    (a, b) => Number(a.name === UNKNOWN) - Number(b.name === UNKNOWN) || b.calls.length - a.calls.length,
  );
}
