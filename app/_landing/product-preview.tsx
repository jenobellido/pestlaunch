import { AudioLines, CalendarDays, ClipboardCheck, Clock, MessageSquareText, Play, UserRound } from "lucide-react";
import { CoachingPanel } from "@/modules/coaching";
import { ScorecardPanel } from "@/modules/scorecards";
import { cn } from "@/shared/lib/cn";
import { Badge, Card, CardTitle } from "@/shared/ui/card";
import { Stagger, StaggerItem } from "@/shared/ui/motion";
import { demoCall, demoCoaching, demoMood, demoScorecard, demoTimeline, demoTranscript } from "./demo";
import { Tilt } from "./tilt";

const SPEAKER = { rep: "bg-accent", customer: "bg-sky" } as const;
const MOOD = { positive: "bg-mood-positive", neutral: "bg-mood-neutral", negative: "bg-mood-negative" } as const;

const CALLOUTS = [
  { icon: AudioLines, title: "Transcribed by speaker", text: "Every word, split into rep and caller, synced to the recording." },
  { icon: ClipboardCheck, title: "Scored on your manual", text: "Each step passed or missed, with the quote from the call that proves it." },
  { icon: MessageSquareText, title: "Coaching that writes itself", text: "One focus and the exact words to try next time, ready for the rep." },
];

/**
 * A call page as the app shows it, with an invented call. The scorecard and coaching panels are
 * the app's own components; the call column uses the same tokens and layout as the call page.
 */
export function ProductPreview() {
  const total = demoTimeline.reduce((n, s) => n + s.share, 0);
  const repShare = Math.round((demoTimeline.filter((s) => s.speaker === "rep").reduce((n, s) => n + s.share, 0) / total) * 100);

  return (
    <section
      id="preview"
      aria-label="What a reviewed call looks like"
      className="relative mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6 lg:pb-32"
    >
      <Tilt>
        <div
          className="pointer-events-none relative rounded-[32px] border border-line bg-panel p-2 shadow-[0_40px_120px_-40px_color-mix(in_oklab,var(--accent)_45%,transparent)] select-none sm:rounded-[36px] sm:p-3"
          aria-hidden
          inert
        >
          {/* Window chrome, so it reads as the app rather than a collage of cards. */}
          <div className="flex items-center gap-3 px-3 pt-1.5 pb-3 sm:px-4">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
            </span>
            <span className="min-w-0 truncate rounded-full bg-chip px-3 py-1 text-xs text-muted">
              Calls <span className="px-1 text-line-strong">/</span> {demoCall.title}
            </span>
          </div>
          {/* Below lg everything stacks, so the preview is cut to one screen's worth and fades out. */}
          <div className="grid max-h-[860px] items-start gap-4 overflow-hidden p-1 sm:p-2 [mask-image:linear-gradient(to_bottom,black_78%,transparent)] lg:max-h-none lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-visible lg:[mask-image:none]">
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
                <div className="mt-2.5 flex h-1.5 gap-[3px] pl-14" title="Caller mood">
                  {demoMood.map((m, i) => (
                    <span key={i} className={cn("rounded-full", MOOD[m.mood])} style={{ flexGrow: m.share }} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-accent" />
                    {demoCall.rep} {repShare}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-sky" />
                    Customer {100 - repShare}%
                  </span>
                  <span className="flex items-center gap-1.5 sm:ml-auto">
                    <span className="size-2 rounded-full bg-mood-negative" />
                    <span className="size-2 rounded-full bg-mood-positive" />
                    Caller went from worried to happy
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

      <p className="mt-6 text-center text-xs text-muted">A made-up call, shown the way your team sees it after every call.</p>
      <Stagger as="ul" className="mt-12 grid gap-6 sm:grid-cols-3 sm:gap-8 lg:mt-16">
        {CALLOUTS.map(({ icon: Icon, title, text }) => (
          <StaggerItem as="li" key={title} className="flex gap-4 sm:flex-col sm:gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-medium">{title}</h3>
              <p className="mt-1 text-sm text-pretty text-muted">{text}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
