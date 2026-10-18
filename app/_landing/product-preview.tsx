import { CalendarDays, Clock, Play, UserRound } from "lucide-react";
import { CoachingPanel } from "@/modules/coaching";
import { ScorecardPanel } from "@/modules/scorecards";
import { cn } from "@/shared/lib/cn";
import { Badge, Card, CardTitle } from "@/shared/ui/card";
import { demoCall, demoCoaching, demoScorecard, demoTimeline, demoTranscript } from "./demo";
import { Tilt } from "./tilt";

const SPEAKER = { rep: "bg-accent", customer: "bg-sky" } as const;

/**
 * A call page as the app shows it, with an invented call. The scorecard and coaching panels are
 * the app's own components; the call column uses the same tokens and layout as the call page.
 */
export function ProductPreview() {
  const total = demoTimeline.reduce((n, s) => n + s.share, 0);
  const repShare = Math.round((demoTimeline.filter((s) => s.speaker === "rep").reduce((n, s) => n + s.share, 0) / total) * 100);

  return (
    <section aria-label="What a reviewed call looks like" className="relative mx-auto -mt-8 max-w-6xl px-4 pb-24 sm:px-6 md:-mt-16">
      <Tilt>
        <div
          className="pointer-events-none relative rounded-[36px] border border-line bg-panel p-3 shadow-[0_40px_120px_-40px_color-mix(in_oklab,var(--accent)_45%,transparent)] select-none sm:p-5"
          aria-hidden
          inert
        >
          {/* Below lg everything stacks, so the preview is cut to one screen's worth and fades out. */}
          <div className="grid max-h-[860px] items-start gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,black_78%,transparent)] lg:max-h-none lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-visible lg:[mask-image:none]">
            <div className="flex min-w-0 flex-col gap-4">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-medium">{demoCall.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
                      <Badge>New customer</Badge>
                      <span className="flex items-center gap-1.5">
                        <UserRound className="size-3.5" aria-hidden />
                        {demoCall.rep}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" aria-hidden />
                        {demoCall.length}
                      </span>
                      <span className="hidden items-center gap-1.5 sm:flex">
                        <CalendarDays className="size-3.5" aria-hidden />
                        {demoCall.when}
                      </span>
                    </div>
                  </div>
                  <Badge dot="bg-success">Booked</Badge>
                </div>
                <p className="mt-4 leading-relaxed text-fg/90">{demoCall.summary}</p>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
                    <Play className="ml-0.5 size-4" fill="currentColor" aria-hidden />
                  </span>
                  <div className="flex h-8 flex-1 items-center gap-[3px]">
                    {demoTimeline.map((s, i) => (
                      <span
                        key={i}
                        className={cn("rounded-[3px]", SPEAKER[s.speaker], s.speaker === "rep" ? "h-4" : "h-2.5")}
                        style={{ flexGrow: s.share }}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-accent" />
                    {demoCall.rep} {repShare}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-sky" />
                    Customer {100 - repShare}%
                  </span>
                </div>
                <CardTitle className="mt-6">Transcript</CardTitle>
                <ol className="mt-3 flex flex-col gap-3">
                  {demoTranscript.map((line, i) => (
                    <li key={i} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2 text-sm">
                      <span className="text-xs text-muted tabular-nums">{line.time}</span>
                      <div>
                        <span className={cn("text-xs font-medium", line.speaker === "rep" ? "text-accent" : "text-sky")}>
                          {line.speaker === "rep" ? demoCall.rep : "Customer"}
                        </span>
                        <p className="mt-0.5 leading-relaxed text-fg/90">{line.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>

            <div className="relative flex max-h-[640px] min-w-0 flex-col gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
              <CoachingPanel feedback={demoCoaching} />
              <ScorecardPanel result={demoScorecard} />
            </div>
          </div>
        </div>
      </Tilt>
    </section>
  );
}
