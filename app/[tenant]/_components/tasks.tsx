"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { ArrowRight, Check, ListTodo, UserPlus, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Spinner } from "@/shared/ui/button";
import { assignTask, reassignTask, removeTask, setTaskDone, type TaskResult } from "../_lib/task-actions";

export interface TaskRow {
  id: string;
  callId: string;
  callTitle: string;
  assigneeId: string;
  assigneeName: string;
  title: string;
  status: "open" | "done";
  /** When it was assigned, to show how long it's been waiting. */
  createdAt?: string;
}

/** "today", "yesterday", "3d ago", "2w ago". */
function age(iso: string, now = Date.now()) {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return days < 14 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

export interface Assignee {
  id: string;
  name: string;
}

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<TaskResult>) => {
    setError(null);
    start(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  };
  return { pending, error, run };
}

/** "Assign" on a leak: choosing a teammate creates a follow-up task on that call. */
export function AssignTask({
  slug,
  callId,
  title,
  members,
}: {
  slug: string;
  callId: string;
  title: string;
  members: Assignee[];
}) {
  const id = useId();
  const { pending, error, run } = useAction();
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <span className="relative inline-flex items-center">
        <label htmlFor={id} className="sr-only">
          Assign a follow-up
        </label>
        <span
          className={cn(
            "pointer-events-none absolute left-2.5 flex items-center text-muted",
            pending && "text-accent",
          )}
          aria-hidden
        >
          {pending ? <Spinner className="size-3.5" /> : <UserPlus className="size-3.5" />}
        </span>
        <select
          id={id}
          value=""
          disabled={pending}
          onChange={(e) => {
            const assigneeId = e.target.value;
            if (assigneeId) run(() => assignTask(slug, callId, assigneeId, title));
          }}
          title={error ?? "Assign a follow-up"}
          className={cn(
            "h-8 w-[6.75rem] cursor-pointer appearance-none rounded-full border bg-card pr-3 pl-8 text-xs font-medium outline-none transition-colors hover:border-accent focus:border-accent focus:ring-4 focus:ring-accent/15",
            error ? "border-danger text-danger" : "border-line text-fg",
          )}
        >
          <option value="">{error ? "Try again" : "Assign"}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </span>
      {error && (
        <span role="alert" className="max-w-48 text-right text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

function TaskItem({
  slug,
  task,
  canManage,
  mine,
  onCallPage = false,
  members,
}: {
  slug: string;
  task: TaskRow;
  canManage: boolean;
  mine: boolean;
  /** On the call's own page the link to it is pointless; say whose task it is instead. */
  onCallPage?: boolean;
  /** Who it can be handed to, for people who assign follow-ups. */
  members?: Assignee[];
}) {
  const { pending, error, run } = useAction();
  const reassignId = useId();
  const done = task.status === "done";
  return (
    <li className="flex items-start gap-3 py-3">
      <button
        type="button"
        disabled={pending || (!mine && !canManage)}
        aria-label={done ? `Reopen: ${task.title}` : `Mark done: ${task.title}`}
        onClick={() => run(() => setTaskDone(slug, task.id, !done))}
        className={cn(
          "press mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-success bg-success text-accent-ink" : "border-line-strong hover:border-accent",
        )}
      >
        {pending ? <Spinner className="size-3" /> : done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
      </button>
      <div className="min-w-0 flex-1 text-sm">
        <p className={cn("line-clamp-2", done && "text-muted line-through")}>{task.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {onCallPage && canManage && members ? (
            <>
              <label htmlFor={reassignId}>Follow-up for</label>{" "}
              <select
                id={reassignId}
                value={task.assigneeId}
                disabled={pending}
                onChange={(e) => {
                  const assigneeId = e.target.value;
                  if (assigneeId !== task.assigneeId) run(() => reassignTask(slug, task.id, assigneeId));
                }}
                className="cursor-pointer rounded-md bg-transparent font-medium text-fg underline decoration-line-strong underline-offset-2 outline-none hover:decoration-accent focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === task.assigneeId && mine ? `${m.name} (you)` : m.name}
                  </option>
                ))}
              </select>
            </>
          ) : onCallPage ? (
            <>Follow-up for {mine ? "you" : task.assigneeName}</>
          ) : (
            <>
              <Link href={`/${slug}/calls/${task.callId}`} className="hover:text-fg hover:underline">
                {task.callTitle}
              </Link>
              {!mine && ` · ${task.assigneeName}`}
              {task.createdAt && task.status === "open" && ` · ${age(task.createdAt)}`}
            </>
          )}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      {canManage && (
        <button
          type="button"
          aria-label={`Remove: ${task.title}`}
          disabled={pending}
          onClick={() => run(() => removeTask(slug, task.id))}
          className="press flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </li>
  );
}

type View = "mine" | "team";

/**
 * Follow-up tasks. People who assign them see the team's, with a Mine / Team switch that
 * opens on Mine whenever they have something open themselves; everyone else sees their own.
 */
export function TasksCard({
  slug,
  tasks,
  canManage,
  currentUserId,
  heading,
  limit,
  seeAllHref,
}: {
  slug: string;
  tasks: TaskRow[];
  canManage: boolean;
  currentUserId: string;
  /** Overrides the title and line under it, e.g. on a rep's page. */
  heading?: { title: string; description: string };
  /** Shows only this many, with a link to the full list. */
  limit?: number;
  seeAllHref?: string;
}) {
  const mineOpen = tasks.filter((t) => t.assigneeId === currentUserId && t.status === "open").length;
  const [view, setView] = useState<View>(mineOpen > 0 ? "mine" : "team");
  const switchable = canManage && !heading;
  const shown = switchable && view === "mine" ? tasks.filter((t) => t.assigneeId === currentUserId) : tasks;
  const open = shown.filter((t) => t.status === "open");
  const recentDone = shown.filter((t) => t.status === "done").slice(0, 3);
  if (tasks.length === 0 && !canManage) return null;

  const description =
    heading?.description ??
    (!canManage
      ? "Calls you've been asked to follow up on."
      : view === "mine"
        ? "Calls you've been asked to follow up on."
        : "Leaks assigned to the team. Use Assign on a leak to add one.");

  return (
    <section id="tasks" className="scroll-mt-6 rounded-[28px] bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <ListTodo className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium">{heading?.title ?? (canManage ? "Follow-up tasks" : "Your tasks")}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
        {switchable ? (
          <div role="group" aria-label="Whose tasks" className="flex rounded-full bg-chip p-1 text-xs font-medium">
            {(
              [
                ["mine", "Mine", mineOpen],
                ["team", "Team", tasks.filter((t) => t.status === "open").length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={cn(
                  "press rounded-full px-3 py-1 tabular-nums transition-colors",
                  view === id ? "bg-card text-fg shadow-sm" : "text-muted hover:text-fg",
                )}
              >
                {label} <span className={view === id ? "text-accent" : ""}>{count}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium tabular-nums">{open.length} open</span>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {switchable && view === "mine" ? "Nothing assigned to you. You're all caught up." : "No follow-ups assigned yet."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {[...open, ...recentDone].slice(0, limit).map((t) => (
            <TaskItem key={t.id} slug={slug} task={t} canManage={canManage} mine={t.assigneeId === currentUserId} />
          ))}
        </ul>
      )}
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="mt-2 flex items-center justify-center gap-1 border-t border-line pt-3 text-sm text-muted hover:text-fg"
        >
          See all follow-ups <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </section>
  );
}

/** The follow-ups on one call, shown at the top of its page so nobody misses who owns it. */
export function CallTasks({
  slug,
  tasks,
  canManage,
  currentUserId,
  members,
}: {
  slug: string;
  tasks: TaskRow[];
  canManage: boolean;
  currentUserId: string;
  /** Lets people who assign follow-ups hand one to someone else. */
  members?: Assignee[];
}) {
  if (tasks.length === 0) return null;
  return (
    <section aria-label="Follow-ups on this call" className="rounded-[28px] border border-orange/30 bg-orange/10 px-5 py-1">
      <ul className="divide-y divide-orange/20">
        {tasks.map((t) => (
          <TaskItem
            key={t.id}
            slug={slug}
            task={t}
            canManage={canManage}
            mine={t.assigneeId === currentUserId}
            onCallPage
            members={members}
          />
        ))}
      </ul>
    </section>
  );
}

/** A plain list of follow-ups, for the Follow-ups page. */
export function TaskList({
  slug,
  tasks,
  canManage,
  currentUserId,
}: {
  slug: string;
  tasks: TaskRow[];
  canManage: boolean;
  currentUserId: string;
}) {
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => (
        <TaskItem key={t.id} slug={slug} task={t} canManage={canManage} mine={t.assigneeId === currentUserId} />
      ))}
    </ul>
  );
}
