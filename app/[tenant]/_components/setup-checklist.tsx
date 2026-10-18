import Link from "next/link";
import { ArrowRight, Check, Rocket, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { hideSetup } from "../_lib/setup-actions";
import type { SetupStep } from "../_lib/setup";

/** "Get set up": the first-run steps, ticked off by what's in the workspace. */
export function SetupChecklist({ slug, steps }: { slug: string; steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <section aria-labelledby="setup-title" className="rounded-[28px] bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Rocket className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="setup-title" className="text-[15px] font-medium">
            Get set up
          </h2>
          <p className="text-sm text-muted">
            {done} of {steps.length} done. A few minutes now and every call gets scored and coached.
          </p>
        </div>
        <form action={hideSetup.bind(null, slug)}>
          <button
            type="submit"
            aria-label="Hide the setup checklist"
            title="Hide"
            className="press flex size-8 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        </form>
      </div>

      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-chip"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>

      <ol className="mt-2 divide-y divide-line">
        {steps.map((step) => {
          const isNext = step === next;
          return (
            <li key={step.id} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  step.done ? "border-success bg-success text-accent-ink" : isNext ? "border-accent" : "border-line-strong",
                )}
                aria-hidden
              >
                {step.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", step.done && "text-muted line-through")}>
                  {step.title}
                  <span className="sr-only">{step.done ? " (done)" : " (to do)"}</span>
                </p>
                {!step.done && <p className="text-sm text-muted">{step.description}</p>}
              </div>
              {!step.done && (
                <Link
                  href={step.action.href}
                  className={cn(
                    "press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium",
                    isNext ? "bg-accent text-accent-ink" : "border border-line hover:bg-card-2",
                  )}
                >
                  {step.action.label}
                  {isNext && <ArrowRight className="size-4" aria-hidden />}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
