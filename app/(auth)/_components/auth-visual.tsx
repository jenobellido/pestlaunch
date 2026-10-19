import { ArrowRight, Check, Frown, MessageSquareText, Play, Smile, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

// Decorative preview of a scored call, in the same look as the landing page. The content is
// invented, not taken from a real call.
const STEPS = [
  { label: "Greeted with company name", passed: true },
  { label: "Summed up the problem", passed: false },
  { label: "Booked the appointment", passed: true },
];

/** Speaker turns as bar heights: rep (accent) and caller (sky) take turns. */
const WAVE = [8, 14, 22, 12, 28, 18, 10, 20, 32, 14, 24, 8, 26, 16, 12, 24, 18, 10, 30, 14, 20, 8, 16, 26, 12, 18, 28, 10, 22, 14, 8, 20, 30, 16, 10, 24];
const speaker = (i: number) => (Math.floor(i / 6) % 2 ? "bg-sky" : "bg-accent");

const glass = "rounded-2xl border border-line bg-card/85 shadow-[0_24px_60px_-28px_rgb(0_0_0/0.5)] backdrop-blur-xl";

export function AuthVisual() {
  return (
    <aside
      className="relative isolate m-3 hidden overflow-hidden rounded-[36px] border border-line bg-panel lg:flex lg:flex-col lg:items-center lg:justify-center"
      aria-hidden
    >
      {/* A faint grid fading out from the centre, under a soft blue glow, as on the landing hero. */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(60%_55%_at_50%_42%,black,transparent)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_50%_40%,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_75%)]" />

      <div className="flex w-full max-w-md flex-col items-center px-10 py-12">
        <div className="relative w-full">
          <div className="rounded-[28px] border border-line bg-card px-6 pt-8 pb-14 shadow-[0_40px_100px_-40px_color-mix(in_oklab,var(--accent)_45%,transparent)]">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
                <Play className="ml-0.5 size-4" fill="currentColor" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">Termite inspection</p>
                <p className="text-sm text-muted">Marisol Vega · 6:42</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-badge-success px-2.5 py-0.5 text-xs font-medium text-on-badge-success">
                Booked
              </span>
            </div>

            <div className="mt-5 flex h-9 items-center gap-[3px]">
              {WAVE.map((h, i) => (
                <span key={i} className={cn("flex-1 rounded-[2px]", speaker(i))} style={{ height: h }} />
              ))}
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted">Sales scorecard</p>
                <p className="text-2xl font-medium tabular-nums">
                  15<span className="text-base text-muted">/17</span>
                </p>
              </div>
              <div className="mt-2.5 flex gap-1">
                {Array.from({ length: 17 }, (_, i) => (
                  <span key={i} className={cn("h-1.5 flex-1 rounded-full", i === 4 || i === 13 ? "bg-inset" : "bg-success")} />
                ))}
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {STEPS.map((step) => (
                  <li key={step.label} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full",
                        step.passed ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
                      )}
                    >
                      {step.passed ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                    </span>
                    <span className={step.passed ? "text-fg/85" : "text-muted"}>{step.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Two chips on opposite corners, so the stack stays balanced. */}
          <div className={cn(glass, "absolute -top-7 -left-10 flex items-center gap-2 px-3 py-2.5 text-sm font-medium")}>
            <span className="flex size-6 items-center justify-center rounded-lg bg-mood-negative/15 text-mood-negative">
              <Frown className="size-3.5" />
            </span>
            <ArrowRight className="size-3.5 text-muted" />
            <span className="flex size-6 items-center justify-center rounded-lg bg-mood-positive/15 text-mood-positive">
              <Smile className="size-3.5" />
            </span>
            Caller mood
          </div>
          <div className={cn(glass, "absolute -right-10 -bottom-8 flex max-w-[15rem] items-start gap-2.5 p-3")}>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <MessageSquareText className="size-3.5" />
            </span>
            <div>
              <p className="text-xs font-medium text-accent">Focus for next call</p>
              <p className="mt-0.5 text-sm leading-snug">Sum up what you heard before you quote.</p>
            </div>
          </div>
        </div>

        <p className="mt-20 text-center text-3xl leading-tight font-medium tracking-tight text-balance">
          Every call, transcribed and scored. <span className="text-accent">Coaching that writes itself.</span>
        </p>
        <p className="mt-3 text-center text-muted">Your manual, your scorecards, your team.</p>
      </div>
    </aside>
  );
}
