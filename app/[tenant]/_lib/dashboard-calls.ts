import { CALL_TYPE_GROUP, CALL_TYPE_LABELS, type CallRecord } from "@/modules/calls";
import { getScorecardResult } from "@/modules/scorecards";
import type { DashboardCall } from "./insights";

/** The plain call list the Overview and Follow-ups maths works on, built from the calls and scorecards modules. */
export function toDashboardCalls(calls: readonly CallRecord[], slug: string, scored: boolean): DashboardCall[] {
  return calls.map((c) => {
    const score = scored ? getScorecardResult(c.analyses) : null;
    return {
      id: c.id,
      href: `/${slug}/calls/${c.id}`,
      title: c.fileName.replace(/\.[^.]+$/, ""),
      typeLabel: c.callType ? CALL_TYPE_LABELS[c.callType] : null,
      group: c.callType ? CALL_TYPE_GROUP[c.callType] : null,
      employeeId: c.employeeId,
      employeeName: c.employeeName,
      createdAt: c.createdAt,
      durationSec: c.durationSec ?? 0,
      status: c.status,
      resolution: c.outcome?.resolution ?? null,
      followUps: c.outcome?.followUps ?? [],
      cancelReason: c.outcome?.cancelReason ?? null,
      score: score ? { points: score.points, maxPoints: score.maxPoints, grade: score.grade } : null,
    };
  });
}
