"use client";

import { useState, useTransition } from "react";
import { Check, ClipboardList, RotateCcw, Send, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Spinner } from "@/shared/ui/button";
import { assignPlay, removePlay, setPlayDone, type PlayResult } from "../actions";

export interface PlayRow {
  id: string;
  assigneeId: string;
  assigneeName: string;
  title: string;
  detail: string | null;
  status: "open" | "done";
  createdAt: string;
}

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<PlayResult>) => {
    setError(null);
    start(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  };
  return { pending, error, run };
}

/** "Assign as a play" under an employee's most-missed step. */
export function AssignPlayButton({
  slug,
  assigneeId,
  assigneeName,
  title,
  detail,
}: {
  slug: string;
  assigneeId: string;
  assigneeName: string;
  title: string;
  detail: string;
}) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3">
      <div className="min-w-0 text-sm">
        <p className="text-xs text-muted">Suggested play</p>
        <p className="font-medium">{title}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => assignPlay(slug, assigneeId, title, detail))}
        className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110 disabled:opacity-70"
      >
        {pending ? <Spinner className="size-3.5" /> : <Send className="size-3.5" aria-hidden />}
        Assign to {assigneeName.split(/\s+/)[0]}
      </button>
      {error && (
        <p role="alert" className="w-full text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function PlayItem({ slug, play, canManage, mine }: { slug: string; play: PlayRow; canManage: boolean; mine: boolean }) {
  const { pending, error, run } = useAction();
  const done = play.status === "done";
  return (
    <li className="flex items-start gap-3 py-3">
      <button
        type="button"
        disabled={pending || (!mine && !canManage)}
        aria-label={done ? `Reopen ${play.title}` : `Mark ${play.title} done`}
        onClick={() => run(() => setPlayDone(slug, play.id, !done))}
        className={cn(
          "press mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-success bg-success text-accent-ink" : "border-line-strong hover:border-accent",
        )}
      >
        {pending ? <Spinner className="size-3" /> : done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
      </button>
      <div className="min-w-0 flex-1 text-sm">
        <p className={cn("font-medium", done && "text-muted line-through")}>{play.title}</p>
        <p className="text-xs text-muted">
          {mine ? "Assigned to you" : play.assigneeName}
          {play.detail && ` · ${play.detail}`}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      {done && (mine || canManage) && (
        <button
          type="button"
          aria-label={`Reopen ${play.title}`}
          onClick={() => run(() => setPlayDone(slug, play.id, false))}
          className="press flex size-8 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-fg"
        >
          <RotateCcw className="size-3.5" aria-hidden />
        </button>
      )}
      {canManage && (
        <button
          type="button"
          aria-label={`Remove ${play.title}`}
          onClick={() => run(() => removePlay(slug, play.id))}
          className="press flex size-8 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </li>
  );
}

/** Open plays first, then the last few done. */
export function PlaysCard({
  slug,
  plays,
  canManage,
  currentUserId,
  heading,
}: {
  slug: string;
  plays: PlayRow[];
  canManage: boolean;
  currentUserId: string;
  /** Overrides the title and line under it, e.g. on a rep's page. */
  heading?: { title: string; description: string };
}) {
  const open = plays.filter((p) => p.status === "open");
  const done = plays.filter((p) => p.status === "done").slice(0, 3);
  if (plays.length === 0 && !canManage) return null;
  return (
    <section className="rounded-[28px] bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <ClipboardList className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium">{heading?.title ?? (canManage ? "Plays" : "Your plays")}</h2>
          <p className="text-sm text-muted">
            {heading?.description ??
              (canManage
                ? "Coaching assigned to the team. Assign a suggested play from a rep's card below."
                : "What your manager asked you to work on.")}
          </p>
        </div>
        <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium tabular-nums">{open.length} open</span>
      </div>
      {plays.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No plays yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {[...open, ...done].map((p) => (
            <PlayItem key={p.id} slug={slug} play={p} canManage={canManage} mine={p.assigneeId === currentUserId} />
          ))}
        </ul>
      )}
    </section>
  );
}
