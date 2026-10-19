"use client";

import { useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { primaryButton, Spinner } from "@/shared/ui/button";
import { loadExamples, removeExamples, type ExampleResult } from "../_lib/example-actions";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<ExampleResult>) =>
    start(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  return { pending, error, run };
}

/** For a company with no calls yet: load the example data to see every page working. */
export function ExampleCallsOffer({ slug }: { slug: string }) {
  const { pending, error, run } = useAction();
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-[28px] border border-accent/30 bg-accent/5 p-5 sm:p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-medium">Try it with example data</h2>
        <p className="text-sm text-muted">
          Load 7 made-up calls and 3 example reps (Jordan, Priya and Marcus), already scored and coached, with follow-ups to
          work through. See how everything fits before you upload your own. Remove it anytime.
        </p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      <button type="button" disabled={pending} onClick={() => run(() => loadExamples(slug))} className={cn(primaryButton, "shrink-0")}>
        {pending && <Spinner className="size-4" />}
        {pending ? "Loading…" : "Load example data"}
      </button>
    </section>
  );
}

/** Shown while the example calls are in: a reminder they're made up, and a way to clear them. */
export function ExampleCallsBar({ slug, calls, reps }: { slug: string; calls: number; reps: number }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-accent/10 px-4 py-2.5 text-sm">
      <Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
      <span className="min-w-0 flex-1">
        Example data is loaded: {calls} calls{reps > 0 && ` and ${reps} reps`}. It&apos;s made up; upload a recording to see your own.
      </span>
      {error && (
        <span role="alert" className="text-danger">
          {error}
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Remove the example calls, reps and their follow-ups? Your own data stays.")) run(() => removeExamples(slug));
        }}
        className="press inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-accent hover:bg-accent/15"
      >
        {pending ? <Spinner className="size-3.5" /> : <X className="size-3.5" aria-hidden />}
        Remove them
      </button>
    </div>
  );
}

/** Settings → Company: load or remove the example data at any time, even once there's real data. */
export function ExampleCallsSetting({
  slug,
  calls,
  reps,
  canEdit,
}: {
  slug: string;
  calls: number;
  reps: number;
  canEdit: boolean;
}) {
  const { pending, error, run } = useAction();
  const loaded = calls > 0 || reps > 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 text-sm">
        <p className="font-medium">{loaded ? `Loaded: ${calls} calls and ${reps} reps` : "Not loaded"}</p>
        <p className="text-muted">
          {loaded
            ? "They show up alongside your own data. Removing them takes away the example calls, reps, follow-ups and plays, and nothing else."
            : "7 made-up calls and 3 example reps, already scored and coached, with follow-ups and coaching plays. Nothing is processed or charged."}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-danger">
            {error}
          </p>
        )}
      </div>
      {canEdit && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!loaded) run(() => loadExamples(slug));
            else if (confirm("Remove the example calls, reps and their follow-ups? Your own data stays.")) run(() => removeExamples(slug));
          }}
          className={cn(
            "press inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium",
            loaded ? "border border-line hover:bg-card-2" : "bg-accent text-accent-ink hover:brightness-110",
          )}
        >
          {pending && <Spinner className="size-4" />}
          {loaded ? "Remove example data" : "Load example data"}
        </button>
      )}
    </div>
  );
}
