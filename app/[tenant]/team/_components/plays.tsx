"use client";

import { useId, useState, useTransition } from "react";
import { Check, ClipboardList, Plus, RotateCcw, Send, Target, X } from "lucide-react";
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

/** "Assign as a coaching focus" under a rep's most-missed step. (Stored as a "play".) */
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
        <p className="text-xs text-muted">Suggested focus</p>
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

/** A rep's coaching focus: open first, then the last few done. (Stored as "plays".) */
export function PlaysCard({
  slug,
  plays,
  canManage,
  currentUserId,
  heading,
  addFor,
}: {
  slug: string;
  plays: PlayRow[];
  canManage: boolean;
  currentUserId: string;
  /** Overrides the title and line under it, e.g. on a rep's page. */
  heading?: { title: string; description: string };
  /** Shows "Add a focus" for this rep (people who manage coaching, on a rep's page). */
  addFor?: { id: string; name: string };
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
          <h2 className="text-[15px] font-medium">{heading?.title ?? (canManage ? "Coaching focus" : "Your coaching focus")}</h2>
          <p className="text-sm text-muted">
            {heading?.description ??
              (canManage
                ? "What each rep is working on. Assign a suggested focus from a rep's card, or add your own on their page or from a call."
                : "What your manager asked you to work on.")}
          </p>
        </div>
        <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium tabular-nums">{open.length} open</span>
      </div>
      {plays.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nothing assigned yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {[...open, ...done].map((p) => (
            <PlayItem key={p.id} slug={slug} play={p} canManage={canManage} mine={p.assigneeId === currentUserId} />
          ))}
        </ul>
      )}
      {canManage && addFor && <AddFocus slug={slug} assignee={addFor} />}
    </section>
  );
}

const input =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15";

/** Write your own focus for a rep: a short title, and what good looks like. */
function AddFocus({ slug, assignee }: { slug: string; assignee: { id: string; name: string } }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const { pending, error, run } = useAction();
  const id = useId();
  const first = assignee.name.split(/\s+/)[0];
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-accent hover:bg-accent/10"
      >
        <Plus className="size-4" aria-hidden />
        Add a focus for {first}
      </button>
    );
  }
  return (
    <form
      className="mt-3 grid gap-2 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const result = await assignPlay(slug, assignee.id, title, detail.trim() || null);
          if (result.ok) {
            setTitle("");
            setDetail("");
            setOpen(false);
          }
          return result;
        });
      }}
    >
      <label htmlFor={`${id}-title`} className="text-sm font-medium">
        What should {first} work on?
      </label>
      <input
        id={`${id}-title`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Mention the referral program before hanging up"
        maxLength={120}
        className={cn(input, "h-10")}
        autoFocus
      />
      <textarea
        aria-label="What good looks like (optional)"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="What good looks like (optional), e.g. a line to say"
        maxLength={500}
        rows={2}
        className={cn(input, "resize-y")}
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || title.trim().length < 3}
          className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110 disabled:opacity-50"
        >
          {pending ? <Spinner className="size-3.5" /> : <Send className="size-3.5" aria-hidden />}
          Assign to {first}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="press h-9 rounded-full px-4 text-sm text-muted hover:bg-card-2 hover:text-fg">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** On a call's coaching: turn one improvement into a coaching focus for the call's rep. */
export function MakeFocusButton({
  slug,
  assignee,
  title,
  detail,
  alreadyAssigned,
}: {
  slug: string;
  assignee: { id: string; name: string };
  title: string;
  detail: string;
  /** This exact focus is already open for the rep. */
  alreadyAssigned: boolean;
}) {
  const { pending, error, run } = useAction();
  const [done, setDone] = useState(alreadyAssigned);
  const first = assignee.name.split(/\s+/)[0];
  if (done) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-success">
        <Check className="size-3.5" aria-hidden />
        A coaching focus for {first}
      </p>
    );
  }
  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(async () => {
            const result = await assignPlay(slug, assignee.id, title.slice(0, 120), detail.slice(0, 500));
            if (result.ok) setDone(true);
            return result;
          })
        }
        className="press inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent"
      >
        {pending ? <Spinner className="size-3" /> : <Target className="size-3.5" aria-hidden />}
        Make this {first}&apos;s focus
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
