import { Check, ListTodo, ShieldCheck, UserCheck, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/card";
import { Stagger, StaggerItem } from "@/shared/ui/motion";

const cell =
  "group relative flex min-h-64 flex-col overflow-hidden rounded-[28px] border border-line p-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 sm:p-7";

/** Gold, Green and Below as one ring: how a call's points land against the thresholds. */
function ScoreRing() {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto mt-8 size-44 sm:size-52">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-inset" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          className="landing-ring stroke-accent"
          style={{ strokeDasharray: c, ["--ring-to" as string]: c * (1 - 15 / 17) }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-medium tabular-nums">
          15<span className="text-xl text-muted">/17</span>
        </span>
        <span className="mt-1 text-xs text-muted">Green Standard</span>
      </div>
    </div>
  );
}

/** A call's speaker turns as bars that rise and fall, like the timeline on a call page. */
function SpeakerBars() {
  const bars = [3, 5, 8, 4, 9, 6, 3, 7, 10, 5, 4, 8, 6, 9, 3, 5, 7, 4, 8, 6, 5, 9, 4, 7, 3, 6, 8, 5];
  return (
    <div className="mt-auto flex h-24 items-center gap-1.5 pt-8" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn("landing-bar w-full rounded-full", Math.floor(i / 4) % 2 ? "bg-sky" : "bg-accent")}
          style={{ height: `${h * 9}%`, animationDelay: `${(i % 7) * -0.23}s` }}
        />
      ))}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6 lg:py-32">
      <div className="max-w-2xl">
        <h2 className="text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl">
          Built around how pest control offices actually run.
        </h2>
        <p className="mt-4 text-muted">Your scripts, your scorecards, your team. Nothing generic about it.</p>
      </div>

      <Stagger className="mt-12 grid gap-4 md:grid-cols-4" stagger={0.07}>
        <StaggerItem
          className={cn(
            cell,
            "bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--accent)_20%,var(--card)),var(--card))] md:col-span-2 md:row-span-2",
          )}
        >
          <h3 className="text-xl font-medium">Your scorecards, not a generic AI rubric</h3>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Sales, retention and every other call graded on the steps from your own call manuals. Points and grades are
            counted the same way every time.
          </p>
          <ScoreRing />
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Badge dot="bg-orange">Gold 17</Badge>
            <Badge dot="bg-success">Green 14+</Badge>
            <Badge dot="bg-danger">Below 13 or less</Badge>
          </div>
        </StaggerItem>

        <StaggerItem className={cn(cell, "bg-card md:col-span-2")}>
          <h3 className="text-xl font-medium">See who talked, and when</h3>
          <p className="mt-2 max-w-md text-sm text-muted">
            Click any line to hear that moment. Talk share shows when a rep listens and when they lecture.
          </p>
          <SpeakerBars />
        </StaggerItem>

        <StaggerItem className={cn(cell, "bg-card")}>
          <UserCheck className="size-6 text-accent" aria-hidden />
          <h3 className="mt-auto pt-10 text-lg font-medium">You have the last word</h3>
          <p className="mt-2 text-sm text-muted">Managers can flip any step the AI got wrong. The grade updates on the spot.</p>
          <div className="mt-4 flex gap-2" aria-hidden>
            <span className="flex size-7 items-center justify-center rounded-full bg-danger/15 text-danger line-through decoration-2">
              <X className="size-3.5" />
            </span>
            <span className="flex size-7 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="size-3.5" />
            </span>
          </div>
        </StaggerItem>

        <StaggerItem
          className={cn(
            cell,
            "bg-[repeating-linear-gradient(135deg,var(--card)_0_14px,color-mix(in_oklab,var(--card)_92%,var(--fg))_14px_15px)]",
          )}
        >
          <ListTodo className="size-6 text-accent" aria-hidden />
          <h3 className="mt-auto pt-10 text-lg font-medium">Nothing falls through</h3>
          <p className="mt-2 text-sm text-muted">
            Unbooked sales calls and callbacks you owe show who called, what for, the price given and how long they&apos;ve
            waited. Assign one in a click.
          </p>
          <div className="mt-4 flex flex-wrap gap-2" aria-hidden>
            <Badge dot="bg-orange">Callback owed, 2 days</Badge>
          </div>
        </StaggerItem>

        <StaggerItem className={cn(cell, "min-h-0 bg-card md:col-span-4 md:flex-row md:items-center md:gap-10")}>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <div className="mt-6 md:mt-0">
            <h3 className="text-lg font-medium">Roles you control</h3>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Reps see their own calls and coaching. Managers see the team. You decide who can upload, assign, review and
              delete.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 md:mt-0 md:ml-auto md:justify-end">
            <Badge>Owner</Badge>
            <Badge>Manager</Badge>
            <Badge>Rep</Badge>
            <Badge>Your own roles</Badge>
          </div>
        </StaggerItem>
      </Stagger>
    </section>
  );
}
