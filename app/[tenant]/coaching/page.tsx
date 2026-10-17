import { CALL_TYPE_LABELS } from "@/modules/calls";
import { callScope, listCalls } from "@/modules/calls/server";
import { CoachingPage, getCoachingFeedback, type CoachingCall } from "@/modules/coaching";
import { isModuleEnabled } from "@/modules/registry";
import { getScorecardResult } from "@/modules/scorecards";
import { requireModule } from "../_lib/require-module";

// The app layer composes modules: calls supply the list, scorecards the scores (when the
// module is on), and coaching turns them into per-employee summaries.
export default async function Page({ params }: PageProps<"/[tenant]/coaching">) {
  const { tenant, user, permissions } = await requireModule(params, "coaching");
  const [calls, scored] = await Promise.all([
    // Without "calls.view_all" a member sees only their own coaching.
    listCalls(tenant.slug, callScope({ userId: user.id, permissions })),
    isModuleEnabled(tenant.slug, "scorecards"),
  ]);

  const reviewed: CoachingCall[] = calls
    .filter((c) => c.status === "ready")
    .map((c) => {
      const result = scored ? getScorecardResult(c.analyses) : null;
      return {
        id: c.id,
        href: `/${tenant.slug}/calls/${c.id}`,
        title: c.fileName.replace(/\.[^.]+$/, ""),
        callType: c.callType ? CALL_TYPE_LABELS[c.callType] : null,
        employeeId: c.employeeId,
        employeeName: c.employeeName,
        createdAt: c.createdAt,
        score: result
          ? {
              points: result.points,
              maxPoints: result.maxPoints,
              grade: result.grade,
              missed: result.items.filter((i) => !i.passed).map((i) => i.item),
            }
          : undefined,
        coaching: getCoachingFeedback(c.analyses),
      };
    });

  return <CoachingPage calls={reviewed} />;
}
