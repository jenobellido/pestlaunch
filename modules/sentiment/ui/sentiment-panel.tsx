"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Frown, HeartPulse, Meh, Minus, Smile, TrendingDown, TrendingUp } from "lucide-react";
import type { TranscriptSegment } from "@/core/calls";
import { cn } from "@/shared/lib/cn";
import { Card, CardTitle } from "@/shared/ui/card";
import {
  customerMood,
  MOOD_THRESHOLD,
  moodMoments,
  moodSentiment,
  moodSummary,
  sentimentShares,
  type MomentKind,
  type MoodTrend,
} from "../model/sentiment";
import type { CallSentiment, Sentiment } from "../model/types";

const LABEL: Record<Sentiment, string> = { positive: "Positive", neutral: "Neutral", negative: "Negative" };
const FILL: Record<Sentiment, string> = { positive: "bg-mood-positive", neutral: "bg-mood-neutral", negative: "bg-mood-negative" };

/** How the customer felt, in the words a manager would use. */
const FEELING: Record<Sentiment, { label: string; icon: typeof Smile; tone: string }> = {
  positive: { label: "Happy", icon: Smile, tone: "bg-mood-positive/15 text-mood-positive" },
  neutral: { label: "Neutral", icon: Meh, tone: "bg-chip text-fg/80" },
  negative: { label: "Upset", icon: Frown, tone: "bg-mood-negative/15 text-mood-negative" },
};

const MOMENT: Record<MomentKind, { label: string; icon: typeof Smile; tone: string; dot: string }> = {
  turned_negative: { label: "Became upset", icon: Frown, tone: "text-mood-negative", dot: "bg-mood-negative" },
  recovered: { label: "Calmed down", icon: Smile, tone: "text-mood-positive", dot: "bg-mood-positive" },
  turned_positive: { label: "Turned positive", icon: Smile, tone: "text-mood-positive", dot: "bg-mood-positive" },
};

const TREND: Record<MoodTrend, { label: string; icon: typeof TrendingUp; tone: string }> = {
  improved: { label: "Improved", icon: TrendingUp, tone: "bg-mood-positive/15 text-mood-positive" },
  worsened: { label: "Got worse", icon: TrendingDown, tone: "bg-mood-negative/15 text-mood-negative" },
  steady: { label: "Steady", icon: Minus, tone: "bg-chip text-fg/80" },
};

const time = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

// The mood chart's drawing box, in SVG units; it stretches to the panel's width.
const W = 600;
const H = 120;
const MID = H / 2;
/** Where the neutral band starts and ends, so the chart agrees with how moods are labelled. */
const NEUTRAL_TOP = ((1 - MOOD_THRESHOLD) / 2) * H;
const NEUTRAL_BOTTOM = ((1 + MOOD_THRESHOLD) / 2) * H;

function Feeling({ sentiment, caption }: { sentiment: Sentiment; caption: string }) {
  const { label, icon: Icon, tone } = FEELING[sentiment];
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted">{caption}</span>
        <span className="block text-sm font-medium">{label}</span>
      </span>
    </span>
  );
}

/**
 * How the customer felt through the call: where they started and ended, their mood over time,
 * the share of talk time per sentiment, and the moments it changed (links that jump the player
 * there). Which parts of the recording were positive or negative is also drawn under the
 * player (sentimentRanges). Sentiment is read from the transcript's words, not the voice.
 */
export function SentimentPanel({
  sentiment,
  transcript,
  durationSec,
}: {
  sentiment: CallSentiment | null | undefined;
  transcript: readonly TranscriptSegment[];
  durationSec?: number;
}) {
  const ids = useId();
  const chart = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => {
    if (!sentiment?.turns.length) return null;
    const turns = sentiment.turns;
    const duration = Math.max(durationSec ?? 0, ...turns.map((t) => t.end), 1);
    // A turn's words, found by its start time (turns are the transcript's segments).
    const words = new Map(transcript.map((s) => [s.start, s.text]));
    return {
      duration,
      words,
      shares: sentimentShares(turns),
      mood: customerMood(turns),
      moments: moodMoments(turns),
      summary: moodSummary(turns),
    };
  }, [sentiment, transcript, durationSec]);

  if (!data) return null;
  const { duration, words, shares, mood, moments, summary } = data;
  const x = (sec: number) => (sec / duration) * W;
  const y = (m: number) => ((1 - m) / 2) * H;
  const pct = (sec: number) => `${(x(sec) / W) * 100}%`;
  // The curve runs edge to edge: it holds the first mood from the start and the last to the end.
  const points = mood.length ? [{ at: 0, mood: mood[0].mood }, ...mood, { at: duration, mood: mood.at(-1)!.mood }] : [];
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.mood).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${W},${MID} L0,${MID} Z` : "";
  const point = hover === null ? null : mood[hover];
  const trend = summary ? TREND[summary.trend] : null;
  const moodAt = (at: number) => mood.find((p) => p.at === at)?.mood ?? 0;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const box = chart.current?.getBoundingClientRect();
    if (!box || mood.length === 0) return;
    const at = ((e.clientX - box.left) / box.width) * duration;
    let nearest = 0;
    for (let i = 1; i < mood.length; i++) if (Math.abs(mood[i].at - at) < Math.abs(mood[nearest].at - at)) nearest = i;
    setHover(nearest);
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <HeartPulse className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle>Customer sentiment</CardTitle>
          <p className="text-sm text-muted">How the caller felt, from what they said.</p>
        </div>
        {trend && (
          <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", trend.tone)}>
            <trend.icon className="size-3.5" aria-hidden />
            {trend.label}
          </span>
        )}
      </div>

      {summary && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-chip/60 p-3">
          <Feeling sentiment={summary.start} caption="Started" />
          <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
          <Feeling sentiment={summary.end} caption="Ended" />
        </div>
      )}

      {mood.length >= 2 && (
        <div className="mt-5">
          <div className="flex gap-2">
            {/* Labels sit in their own gutter so they never cover the line. */}
            <div className="flex w-14 shrink-0 flex-col justify-between py-0.5 text-[11px] font-medium" aria-hidden>
              <span className="text-mood-positive">Positive</span>
              <span className="text-muted">Neutral</span>
              <span className="text-mood-negative">Negative</span>
            </div>
            <div
              ref={chart}
              className="relative h-28 min-w-0 flex-1 touch-none select-none"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            >
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full overflow-visible" aria-hidden>
                <defs>
                  <clipPath id={`${ids}-above`}>
                    <rect x="0" y="0" width={W} height={MID} />
                  </clipPath>
                  <clipPath id={`${ids}-below`}>
                    <rect x="0" y={MID} width={W} height={MID} />
                  </clipPath>
                </defs>
                <rect x="0" y="0" width={W} height={H} rx="10" className="fill-chip" opacity="0.5" />
                <rect x="0" y={NEUTRAL_TOP} width={W} height={NEUTRAL_BOTTOM - NEUTRAL_TOP} className="fill-chip" />
                {/* Above the middle the area is green, below it red: the shape tells the story. */}
                <path d={area} clipPath={`url(#${ids}-above)`} fill="var(--mood-positive)" opacity="0.28" />
                <path d={area} clipPath={`url(#${ids}-below)`} fill="var(--mood-negative)" opacity="0.28" />
                <line x1="0" x2={W} y1={MID} y2={MID} className="stroke-line-strong" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                <path d={line} clipPath={`url(#${ids}-above)`} fill="none" stroke="var(--mood-positive)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <path d={line} clipPath={`url(#${ids}-below)`} fill="none" stroke="var(--mood-negative)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              {moments.map((m) => (
                <a
                  key={`${m.kind}-${m.at}`}
                  href={`#t=${Math.floor(m.at)}`}
                  aria-label={`${time(m.at)}: ${MOMENT[m.kind].label}`}
                  className={cn(
                    "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-card transition-transform hover:scale-125",
                    MOMENT[m.kind].dot,
                  )}
                  style={{ left: pct(m.at), top: `${(y(moodAt(m.at)) / H) * 100}%` }}
                />
              ))}
              {point && (
                <>
                  <span className="pointer-events-none absolute inset-y-0 w-px bg-line-strong" style={{ left: pct(point.at) }} />
                  <span
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg ring-2 ring-card"
                    style={{ left: pct(point.at), top: `${(y(point.mood) / H) * 100}%` }}
                  />
                  <div
                    className={cn(
                      "pointer-events-none absolute top-0 z-10 w-56 rounded-xl border border-line bg-card p-3 text-xs shadow-lg",
                      x(point.at) / W > 0.55 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3",
                    )}
                    style={{ left: pct(point.at) }}
                    role="status"
                  >
                    <p className="flex items-center justify-between gap-2 text-muted">
                      <span className="tabular-nums">{time(point.at)}</span>
                      <span className="flex items-center gap-1.5 font-medium text-fg">
                        <span className={cn("size-2 rounded-full", FILL[moodSentiment(point.mood)])} aria-hidden />
                        {LABEL[moodSentiment(point.mood)]}
                      </span>
                    </p>
                    {words.get(point.turn.start) && (
                      <p className="mt-1.5 line-clamp-3 text-fg/90">&ldquo;{words.get(point.turn.start)}&rdquo;</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-1 flex justify-between pl-16 text-[11px] text-muted tabular-nums">
            <span>0:00</span>
            <span>{time(duration)}</span>
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="text-xs text-muted">Share of talk time</p>
        <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {(["positive", "neutral", "negative"] as const)
            .filter((s) => shares[s] > 0)
            .map((s) => (
              <span key={s} className={cn("h-full first:rounded-l-full last:rounded-r-full", FILL[s])} style={{ width: `${shares[s] * 100}%` }} />
            ))}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {(["positive", "neutral", "negative"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", FILL[s])} aria-hidden />
              {LABEL[s]} <span className="font-medium text-fg tabular-nums">{Math.round(shares[s] * 100)}%</span>
            </span>
          ))}
        </p>
      </div>

      {moments.length > 0 && (
        <div className="mt-5">
          <p className="text-xs text-muted">Where it turned</p>
          <ul className="mt-2 divide-y divide-line">
            {moments.map((m) => {
              const { label, icon: Icon, tone } = MOMENT[m.kind];
              const said = words.get(m.turn.start);
              return (
                <li key={`${m.kind}-${m.at}`} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <a
                    href={`#t=${Math.floor(m.at)}`}
                    className="press mt-px shrink-0 rounded-full bg-chip px-2 py-0.5 text-xs font-medium tabular-nums text-accent hover:bg-accent/15"
                    aria-label={`Play from ${time(m.at)}`}
                  >
                    {time(m.at)}
                  </a>
                  <div className="min-w-0 text-sm">
                    <p className={cn("flex items-center gap-1.5 font-medium", tone)}>
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {label}
                    </p>
                    {said && <p className="mt-0.5 line-clamp-2 text-muted">&ldquo;{said}&rdquo;</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-5 text-xs text-muted">Read from what was said, not the tone of voice.</p>
    </Card>
  );
}
