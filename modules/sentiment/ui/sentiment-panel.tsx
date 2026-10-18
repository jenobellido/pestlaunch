"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Frown, Minus, Smile, TrendingDown, TrendingUp } from "lucide-react";
import type { TranscriptSegment } from "@/core/calls";
import { cn } from "@/shared/lib/cn";
import { Card, CardTitle } from "@/shared/ui/card";
import {
  customerMood,
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

const MOMENT: Record<MomentKind, { label: string; icon: typeof Smile; tone: string }> = {
  turned_negative: { label: "Customer became upset", icon: Frown, tone: "text-mood-negative" },
  recovered: { label: "Customer calmed down", icon: Smile, tone: "text-mood-positive" },
  turned_positive: { label: "Customer turned positive", icon: Smile, tone: "text-mood-positive" },
};

const TREND: Record<MoodTrend, { label: string; icon: typeof TrendingUp }> = {
  improved: { label: "Improved", icon: TrendingUp },
  worsened: { label: "Worsened", icon: TrendingDown },
  steady: { label: "Steady", icon: Minus },
};

const time = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const lower = (s: Sentiment) => LABEL[s].toLowerCase();

// The mood chart's drawing box, in SVG units; it stretches to the panel's width.
const W = 600;
const H = 120;

/**
 * How the customer felt through the call: their mood over time, the share of talk time per
 * sentiment, and the moments it changed (links that jump the player there). Which parts of the
 * recording were positive or negative is drawn under the player instead (sentimentRanges).
 * Sentiment is read from the transcript's words, not the voice.
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
  const gradient = useId();
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
  const path = mood.map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.mood).toFixed(1)}`).join(" ");
  const point = hover === null ? null : mood[hover];
  const Trend = summary ? TREND[summary.trend].icon : null;

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Customer sentiment</CardTitle>
          {summary && (
            <p className="mt-1 text-sm text-muted">
              Started {lower(summary.start)}, ended {lower(summary.end)}.
            </p>
          )}
        </div>
        {summary && Trend && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium text-fg/80">
            <Trend className="size-3.5" aria-hidden />
            {TREND[summary.trend].label}
          </span>
        )}
      </div>

      {mood.length >= 2 && (
        <>
          <p className="mt-5 text-xs text-muted">Customer mood</p>
          <div
            ref={chart}
            className="relative mt-2 h-24 touch-none select-none"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full overflow-visible" aria-hidden>
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="var(--mood-positive)" />
                  <stop offset="0.5" stopColor="var(--mood-positive)" />
                  <stop offset="0.5" stopColor="var(--mood-negative)" />
                  <stop offset="1" stopColor="var(--mood-negative)" />
                </linearGradient>
              </defs>
              <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="stroke-line-strong" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              <path d={path} fill="none" stroke={`url(#${gradient})`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="pointer-events-none absolute top-0 left-0 text-[11px] text-muted">Positive</span>
            <span className="pointer-events-none absolute bottom-0 left-0 text-[11px] text-muted">Negative</span>
            {moments.map((m) => (
              <span
                key={`${m.kind}-${m.at}`}
                className={cn(
                  "pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
                  m.kind === "turned_negative" ? "bg-mood-negative" : "bg-mood-positive",
                )}
                style={{ left: `${(x(m.at) / W) * 100}%`, top: `${(y(customerMoodAt(mood, m.at)) / H) * 100}%` }}
              />
            ))}
            {point && (
              <>
                <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-line-strong" style={{ left: `${(x(point.at) / W) * 100}%` }} />
                <span
                  className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg ring-2 ring-card"
                  style={{ left: `${(x(point.at) / W) * 100}%`, top: `${(y(point.mood) / H) * 100}%` }}
                />
                <div
                  className={cn(
                    "pointer-events-none absolute top-0 z-10 w-56 rounded-xl border border-line bg-card p-3 text-xs shadow-lg",
                    x(point.at) / W > 0.55 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3",
                  )}
                  style={{ left: `${(x(point.at) / W) * 100}%` }}
                  role="status"
                >
                  <p className="flex items-center justify-between gap-2 text-muted">
                    <span className="tabular-nums">{time(point.at)}</span>
                    <span className="flex items-center gap-1.5 font-medium text-fg">
                      <span className={cn("size-2 rounded-full", FILL[moodSentiment(point.mood)])} aria-hidden />
                      {LABEL[moodSentiment(point.mood)]}
                    </span>
                  </p>
                  {words.get(point.turn.start) && <p className="mt-1.5 line-clamp-3 text-fg/90">&ldquo;{words.get(point.turn.start)}&rdquo;</p>}
                </div>
              </>
            )}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted tabular-nums">
            <span>0:00</span>
            <span>{time(duration)}</span>
          </div>
        </>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {(["positive", "neutral", "negative"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", FILL[s])} aria-hidden />
            {LABEL[s]} <span className="font-medium text-fg tabular-nums">{Math.round(shares[s] * 100)}%</span>
          </span>
        ))}
        <span>of talk time, read from the words, not the tone of voice.</span>
      </p>

      {moments.length > 0 && (
        <div className="mt-5">
          <p className="text-xs text-muted">Where it turned</p>
          <ul className="mt-2 space-y-3">
            {moments.map((m) => {
              const { label, icon: Icon, tone } = MOMENT[m.kind];
              const said = words.get(m.turn.start);
              return (
                <li key={`${m.kind}-${m.at}`} className="flex gap-3 text-sm">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
                  <div className="min-w-0">
                    <p>
                      <a href={`#t=${Math.floor(m.at)}`} className="font-medium tabular-nums text-accent hover:underline">
                        {time(m.at)}
                      </a>{" "}
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
    </Card>
  );
}

/** The smoothed mood at a moment, so its marker sits on the line. */
function customerMoodAt(mood: { at: number; mood: number }[], at: number) {
  return mood.find((p) => p.at === at)?.mood ?? 0;
}
