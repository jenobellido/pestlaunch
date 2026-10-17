import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { can, listMembers } from "@/core/tenancy";
import { CALL_TYPE_GROUP, CALL_TYPE_LABELS } from "@/modules/calls";
import { callScope, listCalls, listTasks } from "@/modules/calls/server";
import { isModuleEnabled } from "@/modules/registry";
import { getScorecardResult } from "@/modules/scorecards";
import { Bone, PageHeader, PageStack } from "@/shared/ui/page-header";
import { Overview, RangeChips } from "./_components/overview";
import { requireModule } from "./_lib/require-module";
import { inRange, parseRange, summarize, type DashboardCall } from "./_lib/insights";

// The Overview answers an owner's questions at a glance: are sales calls closing, how many
// cancels are we saving and why not, who's waiting on us, and how well calls follow the process.
async function OverviewBody({ params, searchParams }: PageProps<"/[tenant]">) {
  const access = await requireModule(params, "calls");
  const { tenant, user, permissions } = access;
  const range = parseRange((await searchParams).range);
  const canAssign = can(access, "calls.assign");
  const [calls, scored, tasks, members] = await Promise.all([
    listCalls(tenant.slug, callScope({ userId: user.id, permissions })),
    isModuleEnabled(tenant.slug, "scorecards"),
    // People who assign follow-ups see the team's tasks; everyone else only their own.
    listTasks(tenant.id, canAssign ? {} : { assigneeId: user.id }),
    canAssign ? listMembers(tenant.id) : Promise.resolve(null),
  ]);
  const mine = !can(access, "calls.view_all");

  const dashboardCalls: DashboardCall[] = calls.map((c) => {
    const score = scored ? getScorecardResult(c.analyses) : null;
    return {
      id: c.id,
      href: `/${tenant.slug}/calls/${c.id}`,
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

  return (
    <PageStack>
      <PageHeader
        title="Overview"
        description={mine ? "How your calls are going." : `How calls are going at ${tenant.name}.`}
        icon={LayoutGrid}
        actions={<RangeChips base={`/${tenant.slug}`} range={range} />}
      />
      <Overview
        insights={summarize(inRange(dashboardCalls, range))}
        slug={tenant.slug}
        mine={mine}
        tasks={tasks}
        members={members?.map((m) => ({ id: m.userId, name: m.displayName })) ?? null}
        currentUserId={user.id}
      />
    </PageStack>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex items-center gap-4">
        <Bone className="size-12 rounded-2xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-40 rounded-full" />
          <Bone className="h-4 w-64 rounded-full" />
        </div>
      </div>
      <Bone className="h-28 rounded-[28px]" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Bone className="h-96 rounded-[28px]" />
        <Bone className="h-96 rounded-[28px]" />
      </div>
    </div>
  );
}

export default function TenantDashboardPage(props: PageProps<"/[tenant]">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewBody {...props} />
    </Suspense>
  );
}
