import { Suspense } from "react";
import { cookies } from "next/headers";
import { LayoutGrid } from "lucide-react";
import { can, listInvites, listMembers } from "@/core/tenancy";
import { callScope, listCalls, listTasks } from "@/modules/calls/server";
import { isModuleEnabled } from "@/modules/registry";
import { Bone, PageHeader, PageStack } from "@/shared/ui/page-header";
import { Overview, RangeChips } from "./_components/overview";
import { SetupChecklist } from "./_components/setup-checklist";
import { requireModule } from "./_lib/require-module";
import { toDashboardCalls } from "./_lib/dashboard-calls";
import { inRange, parseRange, summarize } from "./_lib/insights";
import { setupCookieName, setupSteps, showSetup } from "./_lib/setup";

// The Overview answers an owner's questions at a glance: are sales calls closing, how many
// cancels are we saving and why not, who's waiting on us, and how well calls follow the process.
async function OverviewBody({ params, searchParams }: PageProps<"/[tenant]">) {
  const access = await requireModule(params, "calls");
  const { tenant, user, permissions } = access;
  const range = parseRange((await searchParams).range);
  const canAssign = can(access, "calls.assign");
  const canInvite = can(access, "team.manage");
  const [calls, scored, tasks, members, invites, jar] = await Promise.all([
    listCalls(tenant.slug, callScope({ userId: user.id, permissions })),
    isModuleEnabled(tenant.slug, "scorecards"),
    // People who assign follow-ups see the team's tasks; everyone else only their own.
    listTasks(tenant.id, canAssign ? {} : { assigneeId: user.id }),
    canAssign || canInvite ? listMembers(tenant.id) : Promise.resolve(null),
    canInvite ? listInvites(tenant.id) : Promise.resolve([]),
    cookies(),
  ]);
  const mine = !can(access, "calls.view_all");

  const steps = setupSteps({
    slug: tenant.slug,
    can: { upload: can(access, "calls.upload"), invite: canInvite, review: can(access, "calls.review"), assign: canAssign },
    callCount: calls.length,
    teamSize: (members?.length ?? 1) + invites.length,
    reviewedCount: calls.filter((c) => c.review).length,
    taskCount: tasks.length,
  });
  const setup = showSetup(steps, jar.get(setupCookieName(tenant.id))?.value === "1");

  const dashboardCalls = toDashboardCalls(calls, tenant.slug, scored);

  return (
    <PageStack>
      <PageHeader
        title="Overview"
        description={mine ? "How your calls are going." : `How calls are going at ${tenant.name}.`}
        icon={LayoutGrid}
        actions={<RangeChips base={`/${tenant.slug}`} range={range} />}
      />
      {setup && <SetupChecklist slug={tenant.slug} steps={steps} />}
      <Overview
        insights={summarize(inRange(dashboardCalls, range))}
        slug={tenant.slug}
        mine={mine}
        tasks={tasks}
        members={canAssign ? (members?.map((m) => ({ id: m.userId, name: m.displayName })) ?? null) : null}
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
