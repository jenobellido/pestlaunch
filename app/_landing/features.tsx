import { Check, HeartPulse, ListTodo, MessageSquareText, ShieldCheck, Sparkles, UserCheck, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/card";
import { Stagger, StaggerItem } from "@/shared/ui/motion";
import { SectionHeading } from "./section-heading";

const cell =
  "group relative flex flex-col overflow-hidden rounded-[28px] border border-line bg-card p-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 sm:p-7";

function CellIcon({ icon: Icon }: { icon: typeof Check }) {
  return (
    <span className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

function CellText({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h3 className="mt-5 text-lg font-medium sm:text-xl">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-pretty text-muted">{children}</p>
    </>
  );
}

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

/** A made-up caller's mood over a call: worried at first, happy by the end. */
function MoodCurve() {
  const line = "M0,58 C40,58 60,80 100,84 C150,88 170,62 220,52 C270,42 300,22 360,18 L400,16";
  const area = `${line} L400,60 L0,60 Z`;
  return (
    <div className="mt-auto pt-8" aria-hidden>
      <svg viewBox="0 0 400 100" className="h-28 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <clipPath id="mood-above">
            <rect x="0" y="0" width="400" height="60" />
          </clipPath>
          <clipPath id="mood-below">
            <rect x="0" y="60" width="400" height="40" />
          </clipPath>
        </defs>
        <rect x="0" y="0" width="400" height="100" rx="12" className="fill-chip" />
        <line x1="0" x2="400" y1="60" y2="60" className="stroke-line-strong" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <path d={area} clipPath="url(#mood-above)" fill="var(--mood-positive)" opacity="0.25" />
        <path d={area} clipPath="url(#mood-below)" fill="var(--mood-negative)" opacity="0.25" />
        <path d={line} clipPath="url(#mood-above)" fill="none" stroke="var(--mood-positive)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <path d={line} clipPath="url(#mood-below)" fill="none" stroke="var(--mood-negative)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge dot="bg-mood-negative">0:40 Became upset</Badge>
        <Badge dot="bg-mood-positive">3:15 Calmed down</Badge>
      </div>
    </div>
  );
}

const ROLES = [
  { role: "Owner", sees: "Every call, every rep, close rate and the leaks costing you money." },
  { role: "Manager", sees: "The team's calls, reviews and coaching focus for each rep." },
  { role: "Rep", sees: "Their own calls, their scores and what to work on next." },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6 lg:py-32">
      <SectionHeading
        eyebrow="Features"
        title="Built around how pest control offices actually run."
        lede="Your scripts, your scorecards, your team. Nothing generic about it."
      />

      <Stagger className="mt-12 grid gap-4 md:grid-cols-6 lg:mt-16" stagger={0.07}>
        <StaggerItem
          className={cn(
            cell,
            "bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--accent)_20%,var(--card)),var(--card))] md:col-span-3 md:row-span-2",
          )}
        >
          <CellIcon icon={Sparkles} />
          <CellText title="Scored against your own call manual">
            Sales, retention and every other call graded on the steps from your manuals, not a generic AI rubric. Each
            step cites the rep&apos;s own words, and the points are counted the same way every time.
          </CellText>
          <ScoreRing />
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Badge dot="bg-orange">Gold 17</Badge>
            <Badge dot="bg-success">Green 14+</Badge>
            <Badge dot="bg-danger">Below 13 or less</Badge>
          </div>
        </StaggerItem>

        <StaggerItem className={cn(cell, "md:col-span-3")}>
          <CellIcon icon={MessageSquareText} />
          <CellText title="Coaching that writes itself">
            After every call, the rep gets what went well, what to fix and the words to use next time. Managers turn it
            into a coaching focus in one click.
          </CellText>
          <div className="mt-6 rounded-2xl bg-chip p-4" aria-hidden>
            <p className="text-xs font-medium text-accent">Focus for next call</p>
            <p className="mt-1 text-sm">Sum up what you heard before you present the plan.</p>
          </div>
        </StaggerItem>

        <StaggerItem className={cn(cell, "md:col-span-3")}>
          <CellIcon icon={HeartPulse} />
          <CellText title="Sentiment across the whole call">
            See how the caller felt from start to finish, where it turned and the words that turned it.
          </CellText>
          <MoodCurve />
        </StaggerItem>

        <StaggerItem
          className={cn(
            cell,
            "bg-[repeating-linear-gradient(135deg,var(--card)_0_14px,color-mix(in_oklab,var(--card)_92%,var(--fg))_14px_15px)] md:col-span-3 lg:col-span-2",
          )}
        >
          <CellIcon icon={ListTodo} />
          <CellText title="Follow-ups nobody misses">
            Callbacks and quotes promised on a call land on a list with who called, what for and how long they&apos;ve
            waited. Assign one in a click.
          </CellText>
          <div className="mt-auto flex flex-wrap gap-2 pt-6" aria-hidden>
            <Badge dot="bg-orange">Callback owed, 2 days</Badge>
            <Badge dot="bg-success">Quote sent</Badge>
          </div>
        </StaggerItem>

        <StaggerItem className={cn(cell, "md:col-span-3 lg:col-span-2")}>
          <CellIcon icon={UserCheck} />
          <CellText title="You have the last word">
            Managers can flip any step the AI got wrong, with a note. The grade updates on the spot.
          </CellText>
          <div className="mt-auto flex items-center gap-2 pt-6 text-xs text-muted" aria-hidden>
            <span className="flex size-7 items-center justify-center rounded-full bg-danger/15 text-danger">
              <X className="size-3.5" />
            </span>
            <span className="h-px w-6 bg-line-strong" />
            <span className="flex size-7 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="size-3.5" />
            </span>
            Reviewed by a manager
          </div>
        </StaggerItem>

        <StaggerItem className={cn(cell, "md:col-span-6 lg:col-span-2")}>
          <CellIcon icon={ShieldCheck} />
          <CellText title="Roles for owners, managers and reps">
            Everyone sees their part of the app and nothing more. Add your own roles too.
          </CellText>
          <ul className="mt-auto flex flex-col gap-2.5 pt-6">
            {ROLES.map(({ role, sees }) => (
              <li key={role} className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-baseline gap-2 text-sm">
                <span className="font-medium">{role}</span>
                <span className="text-xs leading-relaxed text-muted">{sees}</span>
              </li>
            ))}
          </ul>
        </StaggerItem>
      </Stagger>
    </section>
  );
}
