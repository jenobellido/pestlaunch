import { Suspense } from "react";
import { cookies } from "next/headers";
import { LayoutGrid } from "lucide-react";
import { can, listInvites, listMembers } from "@/core/tenancy";
import { listCalls, listTasks } from "@/modules/calls/server";
import { isPlaceholderEmail } from "@/core/auth/admin";
import { areasFor } from "./_lib/areas";
import { exampleDataStatus } from "./_lib/example-data";
import { isModuleEnabled } from "@/modules/registry";
import { Bone, PageHeader, PageStack } from "@/shared/ui/page-header";
import { Overview, RangeChips } from "./_components/overview";
import { ExampleCallsBar, ExampleCallsOffer } from "./_components/example-calls";
import { SetupChecklist } from "./_components/setup-checklist";
import { requireModule } from "./_lib/require-module";
import { toDashboardCalls } from "./_lib/dashboard-calls";
import { inRange, parseRange, summarize } from "./_lib/insights";
import { setupCookieName, setupSteps, showSetup } from "./_lib/setup";

// The Overview answers an owner's questions at a glance: are sales calls closing, how many
// cancels are we saving and why not, who's waiting on us, and how well calls follow the process.
async function OverviewBody({ params, searchParams }: PageProps<"/[tenant]">) {
  const access = await requireModule(params, "calls");
  const { tenant, user } = access;
  const range = parseRange((await searchParams).range);
  const canAssign = can(access, "calls.assign");
  const canInvite = can(access, "team.manage");
  const canUpload = can(access, "calls.upload");
  // Example data is company setup; whoever manages the company sees every call, so "no calls" is company-wide.
  const canExamples = areasFor(access.permissions).exampleData && can(access, "calls.view_all");
  const [calls, scored, tasks, members, invites, jar, examples] = await Promise.all([
    // A rep's numbers are their own calls, not calls shared with them through a follow-up.
    listCalls(tenant.slug, can(access, "calls.view_all") ? {} : { employeeId: user.id }),
    isModuleEnabled(tenant.slug, "scorecards"),
    // People who assign follow-ups see the team's tasks; everyone else only their own.
    listTasks(tenant.id, canAssign ? {} : { assigneeId: user.id }),
    canAssign || canInvite ? listMembers(tenant.id) : Promise.resolve(null),
    canInvite ? listInvites(tenant.id) : Promise.resolve([]),
    cookies(),
    exampleDataStatus(tenant.id),
  ]);
  const mine = !can(access, "calls.view_all");

  const steps = setupSteps({
    slug: tenant.slug,
    can: { upload: canUpload, invite: canInvite, review: can(access, "calls.review"), assign: canAssign },
    // Example calls don't count: the step is about the company's own first recording.
    callCount: calls.length - examples.calls,
    // Example reps don't count as having invited your team.
    teamSize: (members?.filter((m) => !isPlaceholderEmail(m.email)).length ?? 1) + invites.length,
    reviewedCount: calls.filter((c) => c.review).length,
    // Example follow-ups (on example calls) don't count either.
    taskCount: tasks.filter((t) => !t.callTitle.startsWith("Example - ")).length,
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
      {/* A new company can load made-up calls to try every page; then a bar says they're examples. */}
      {canExamples && calls.length === 0 && <ExampleCallsOffer slug={tenant.slug} />}
      {canExamples && examples.loaded && <ExampleCallsBar slug={tenant.slug} calls={examples.calls} reps={examples.reps} />}
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
