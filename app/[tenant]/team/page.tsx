import { can } from "@/core/tenancy";
import { callScope, listCalls } from "@/modules/calls/server";
import { CoachingPage, getCoachingFeedback, type CoachingCall } from "@/modules/coaching";
import { listPlays } from "@/modules/coaching/server";
import { isModuleEnabled } from "@/modules/registry";
import { getScorecardResult } from "@/modules/scorecards";
import { requireModule } from "../_lib/require-module";
import { AssignPlayButton, PlaysCard } from "./_components/plays";

// The app layer composes modules: calls supply the list, scorecards the scores (when the
// module is on), and coaching turns them into per-employee summaries.
export default async function Page({ params }: PageProps<"/[tenant]/team">) {
  const access = await requireModule(params, "coaching");
  const { tenant, user, permissions } = access;
  const canManage = can(access, "coaching.manage");
  const [calls, scored, plays] = await Promise.all([
    // Without "calls.view_all" a member sees only their own coaching.
    listCalls(tenant.slug, callScope({ userId: user.id, permissions })),
    isModuleEnabled(tenant.slug, "scorecards"),
    // Managers see every play; everyone else only the ones assigned to them.
    listPlays(tenant.id, canManage ? {} : { assigneeId: user.id }),
  ]);
  const openTitles = new Set(plays.filter((p) => p.status === "open").map((p) => `${p.assigneeId}:${p.title}`));

  const reviewed: CoachingCall[] = calls
    .filter((c) => c.status === "ready")
    .map((c) => {
      const result = scored ? getScorecardResult(c.analyses) : null;
      return {
        id: c.id,
        href: `/${tenant.slug}/calls/${c.id}`,
        title: c.fileName.replace(/\.[^.]+$/, ""),
        callType: c.callTypeName ?? null,
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

  return (
    <CoachingPage
      calls={reviewed}
      plays={<PlaysCard slug={tenant.slug} plays={plays} canManage={canManage} currentUserId={user.id} />}
      profileHref={(employee) => (employee.employeeId ? `/${tenant.slug}/team/${employee.employeeId}` : null)}
      employeeAction={(employee) => {
        // Suggest the step they miss most, once it's a pattern (missed on at least 2 calls).
        const top = employee.topMissed[0];
        if (!canManage || !employee.employeeId || !top || top.count < 2) return null;
        const title = `Work on "${top.item}"`;
        if (openTitles.has(`${employee.employeeId}:${title}`)) return null;
        return (
          <AssignPlayButton
            slug={tenant.slug}
            assigneeId={employee.employeeId}
            assigneeName={employee.name}
            title={title}
            detail={`Missed on ${top.count} of ${employee.scoredCalls} scored calls`}
          />
        );
      }}
    />
  );
}
