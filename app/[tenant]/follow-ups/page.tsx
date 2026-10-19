import Link from "next/link";
import { Suspense } from "react";
import { ListTodo } from "lucide-react";
import { can, listMembers } from "@/core/tenancy";
import { callScope, listCalls, listTasks } from "@/modules/calls/server";
import { isModuleEnabled } from "@/modules/registry";
import { cn } from "@/shared/lib/cn";
import { Card, CardTitle } from "@/shared/ui/card";
import { Bone, PageHeader, PageStack } from "@/shared/ui/page-header";
import { LeakRow } from "../_components/overview";
import { TaskList } from "../_components/tasks";
import { toDashboardCalls } from "../_lib/dashboard-calls";
import { summarize } from "../_lib/insights";
import { requireModule } from "../_lib/require-module";

type View = "mine" | "team";
type Status = "open" | "done";

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press rounded-full px-3.5 py-1.5 text-sm tabular-nums transition-colors",
        active ? "bg-accent font-medium text-accent-ink" : "bg-card text-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

// Everything someone has been asked to follow up on, and (for people who assign them) the
// leaks nobody owns yet. Mine / Team and Open / Done live in the URL, so the sidebar badge
// can link straight to "my open follow-ups".
async function FollowUpsBody({ params, searchParams }: PageProps<"/[tenant]/follow-ups">) {
  const access = await requireModule(params, "calls");
  const { tenant, user } = access;
  const slug = tenant.slug;
  const canAssign = can(access, "calls.assign");
  const query = await searchParams;

  const [tasks, members, calls, scored] = await Promise.all([
    // People who assign follow-ups see the team's; everyone else only their own.
    listTasks(tenant.id, canAssign ? {} : { assigneeId: user.id }),
    canAssign ? listMembers(tenant.id) : Promise.resolve(null),
    // Leaks come only from calls the viewer can see.
    canAssign ? listCalls(slug, callScope({ userId: user.id, permissions: access.permissions })) : Promise.resolve([]),
    canAssign ? isModuleEnabled(slug, "scorecards") : Promise.resolve(false),
  ]);

  const mine = tasks.filter((t) => t.assigneeId === user.id);
  const mineOpen = mine.filter((t) => t.status === "open").length;
  const teamOpen = tasks.filter((t) => t.status === "open").length;
  // Assigners land on their own list when they have something open, else the team's.
  const view: View = !canAssign || query.view === "mine" ? "mine" : query.view === "team" ? "team" : mineOpen > 0 ? "mine" : "team";
  const status: Status = query.status === "done" ? "done" : "open";
  const inView = view === "mine" ? mine : tasks;
  const shown = inView.filter((t) => t.status === status);
  const href = (v: View, s: Status) => `/${slug}/follow-ups?view=${v}&status=${s}`;

  // Leaks with no open follow-up yet: the work nobody has picked up.
  const owned = new Set(tasks.filter((t) => t.status === "open").map((t) => t.callId));
  const unowned = canAssign
    ? summarize(toDashboardCalls(calls, slug, scored)).leaks.filter((l) => !owned.has(l.call.id))
    : [];
  const assignees = members?.map((m) => ({ id: m.userId, name: m.displayName })) ?? null;

  return (
    <PageStack>
      <PageHeader
        title="Follow-ups"
        description={
          canAssign
            ? "Calls someone has been asked to follow up on, and leaks that still need an owner."
            : "Calls you've been asked to follow up on."
        }
        icon={ListTodo}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {canAssign ? (
          <nav aria-label="Whose follow-ups" className="flex gap-2">
            <Chip href={href("mine", status)} active={view === "mine"}>
              Mine · {mineOpen}
            </Chip>
            <Chip href={href("team", status)} active={view === "team"}>
              Team · {teamOpen}
            </Chip>
          </nav>
        ) : (
          <span />
        )}
        <nav aria-label="Status" className="flex gap-2">
          <Chip href={href(view, "open")} active={status === "open"}>
            Open
          </Chip>
          <Chip href={href(view, "done")} active={status === "done"}>
            Done
          </Chip>
        </nav>
      </div>

      <div className={cn("grid items-start gap-6", canAssign && "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
        <Card className="min-w-0">
          <CardTitle>
            {status === "open" ? "Open" : "Done"} · {view === "mine" ? "assigned to you" : "whole team"}
          </CardTitle>
          {shown.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {status === "done"
                ? "Nothing finished yet."
                : view === "mine"
                  ? "Nothing assigned to you. You're all caught up."
                  : "No open follow-ups. Assign a leak to give it an owner."}
            </p>
          ) : (
            <div className="mt-2">
              <TaskList slug={slug} tasks={shown} canManage={canAssign} currentUserId={user.id} />
            </div>
          )}
        </Card>

        {canAssign && (
          <Card className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Needs an owner</CardTitle>
                <p className="mt-0.5 text-sm text-muted">Leaks nobody is following up on yet. Assign one to a teammate.</p>
              </div>
              <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium tabular-nums">{unowned.length}</span>
            </div>
            {unowned.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Every leak has an owner. Nice work.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {unowned.map((leak) => (
                  <LeakRow key={leak.call.id} slug={slug} leak={leak} members={assignees} inset />
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </PageStack>
  );
}

function FollowUpsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex items-center gap-4">
        <Bone className="size-12 rounded-2xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-40 rounded-full" />
          <Bone className="h-4 w-72 rounded-full" />
        </div>
      </div>
      <Bone className="h-9 w-64 rounded-full" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Bone className="h-80 rounded-[28px]" />
        <Bone className="h-80 rounded-[28px]" />
      </div>
    </div>
  );
}

export default function FollowUpsPage(props: PageProps<"/[tenant]/follow-ups">) {
  return (
    <Suspense fallback={<FollowUpsSkeleton />}>
      <FollowUpsBody {...props} />
    </Suspense>
  );
}
