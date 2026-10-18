"use client";

import { createContext, use, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import type { TranscriptSegment } from "@/core/calls";
import { cn } from "@/shared/lib/cn";
import type { TimelineBand } from "../model/types";
import { formatDuration } from "./call-status";

interface Player {
  /** False when the recording couldn't be opened; the transcript still works without it. */
  available: boolean;
  time: number;
  duration: number;
  playing: boolean;
  rate: number;
  seek: (sec: number, play?: boolean) => void;
  /** Counts jumps from #t= links, so the transcript can scroll to where it landed. */
  jumps: number;
  toggle: () => void;
  setRate: (rate: number) => void;
}

const PlayerContext = createContext<Player | null>(null);

export function usePlayer() {
  const player = use(PlayerContext);
  if (!player) throw new Error("usePlayer needs a CallPlayerProvider");
  return player;
}

/** Owns the <audio> element and shares its state, so the player and the transcript stay in step. */
export function CallPlayerProvider({
  src,
  durationSec,
  children,
}: {
  src: string | null;
  durationSec?: number;
  children: React.ReactNode;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRateState] = useState(1);
  const [failed, setFailed] = useState(false);
  const [jumps, setJumps] = useState(0);

  // timeupdate fires only ~4 times a second; follow the frame clock while playing so the playhead glides.
  useEffect(() => {
    if (!playing) return;
    let frame = requestAnimationFrame(function tick() {
      if (audio.current) setTime(audio.current.currentTime);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const player: Player = {
    available: src != null && !failed,
    time,
    duration,
    playing,
    rate,
    seek(sec, play = false) {
      const el = audio.current;
      const to = Math.min(Math.max(sec, 0), duration || sec);
      // Without audio (e.g. demo calls) the transcript still follows the position.
      setTime(to);
      if (!el) return;
      el.currentTime = to;
      if (play) void el.play();
    },
    jumps,
    toggle() {
      const el = audio.current;
      if (!el) return;
      if (el.paused) void el.play();
      else el.pause();
    },
    setRate(next) {
      if (audio.current) audio.current.playbackRate = next;
      setRateState(next);
    },
  };

  // Links like <a href="#t=95"> anywhere on the page jump here: on load, and on click (also when
  // the same link is clicked twice, which a hashchange alone would miss).
  const jumpTo = useRef(player.seek);
  useEffect(() => {
    jumpTo.current = player.seek;
  });
  useEffect(() => {
    const go = (hash: string) => {
      const m = /^#t=(\d+(?:\.\d+)?)$/.exec(hash);
      if (!m) return false;
      jumpTo.current(Number(m[1]));
      setJumps((n) => n + 1);
      return true;
    };
    go(window.location.hash);
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="#t="]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const hash = link.getAttribute("href")!;
      if (go(hash)) {
        e.preventDefault();
        history.replaceState(null, "", hash);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <PlayerContext value={player}>
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onError={() => setFailed(true)}
        />
      )}
      {children}
    </PlayerContext>
  );
}

const RATES = [1, 1.25, 1.5, 2];
const BAND_FILL: Record<TimelineBand["tone"], string> = {
  positive: "bg-mood-positive",
  neutral: "bg-mood-neutral",
  negative: "bg-mood-negative",
};
const SPEAKER_FILL = { employee: "bg-accent", customer: "bg-sky", unknown: "bg-muted" } as const;

/** Share of talk time per speaker, from the transcript's timings. */
function talkShare(segments: readonly TranscriptSegment[]) {
  const totals = { employee: 0, customer: 0 };
  for (const s of segments) if (s.speaker !== "unknown") totals[s.speaker] += Math.max(0, s.end - s.start);
  const sum = totals.employee + totals.customer;
  return sum > 0 ? { employee: Math.round((totals.employee / sum) * 100), customer: Math.round((totals.customer / sum) * 100) } : null;
}

function SpeakerBlocks({
  segments,
  total,
  className,
  style,
}: {
  segments: readonly TranscriptSegment[];
  total: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("absolute inset-0", className)} style={style} aria-hidden>
      {segments.map((s, i) => (
        <span
          key={i}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-[3px]",
            s.speaker === "employee" ? "h-4" : "h-2.5",
            SPEAKER_FILL[s.speaker],
          )}
          style={{
            left: `${(s.start / total) * 100}%`,
            width: `max(3px, ${((s.end - s.start) / total) * 100}% - 1px)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Play controls over a speaker timeline: each block is a stretch of talk, mint for the
 * employee and blue for the customer, so you can see who talked when and jump there.
 */
export function CallPlayer({
  segments,
  employeeName,
  bands,
  bandsLabel,
}: {
  segments: readonly TranscriptSegment[];
  employeeName: string | null;
  /** Optional marks under the timeline (e.g. sentiment); nothing extra is drawn without them. */
  bands?: readonly TimelineBand[];
  /** What the bands show, e.g. "Sentiment". */
  bandsLabel?: string;
}) {
  const player = usePlayer();
  const total = player.duration || segments.at(-1)?.end || 0;
  const progress = total > 0 ? Math.min(player.time / total, 1) : 0;
  const share = talkShare(segments);
  const iconButton =
    "press flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-card-2 hover:text-fg focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={player.toggle}
          disabled={!player.available}
          aria-label={player.playing ? "Pause" : "Play"}
          className="press flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink hover:brightness-110 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {player.playing ? <Pause className="size-5" fill="currentColor" aria-hidden /> : <Play className="ml-0.5 size-5" fill="currentColor" aria-hidden />}
        </button>
        <button type="button" onClick={() => player.seek(player.time - 10)} disabled={!player.available} aria-label="Back 10 seconds" className={iconButton}>
          <RotateCcw className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={() => player.seek(player.time + 10)} disabled={!player.available} aria-label="Forward 10 seconds" className={iconButton}>
          <RotateCw className="size-4" aria-hidden />
        </button>
        <span className="ml-1 text-sm tabular-nums">
          {formatDuration(player.time)}
          <span className="text-muted"> / {formatDuration(total)}</span>
        </span>
        <button
          type="button"
          onClick={() => player.setRate(RATES[(RATES.indexOf(player.rate) + 1) % RATES.length])}
          disabled={!player.available}
          aria-label={`Playback speed ${player.rate}×`}
          className="press ml-auto h-8 shrink-0 rounded-full bg-chip px-3 text-xs font-medium tabular-nums hover:bg-card-2 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none disabled:opacity-40"
        >
          {player.rate}×
        </button>
      </div>

      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-inset" aria-hidden />
        {total > 0 && (
          <>
            <SpeakerBlocks segments={segments} total={total} className="opacity-35" />
            {/* The played part at full strength: the same blocks, clipped at the playhead. */}
            <SpeakerBlocks
              segments={segments}
              total={total}
              style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}
            />
          </>
        )}
        <span
          className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-fg"
          style={{ left: `${progress * 100}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={0}
          max={total || 1}
          step={0.1}
          value={Math.min(player.time, total || 1)}
          onChange={(e) => player.seek(Number(e.target.value))}
          disabled={!player.available}
          aria-label="Seek"
          aria-valuetext={`${formatDuration(player.time)} of ${formatDuration(total)}`}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
        />
        <span className="pointer-events-none absolute -inset-1 rounded-xl ring-accent/25 peer-focus-visible:ring-4" aria-hidden />
      </div>

      {bands && bands.length > 0 && total > 0 && (
        <div
          className="relative -mt-1 h-1.5"
          role="img"
          aria-label={`${bandsLabel ?? "Marks"}: ${bands.map((b) => `${formatDuration(b.start)} to ${formatDuration(b.end)} ${b.label}`).join(", ")}`}
        >
          {bands.map((b, i) => (
            <span
              key={i}
              title={`${formatDuration(b.start)} to ${formatDuration(b.end)}: ${b.label}`}
              className={cn("absolute inset-y-0 rounded-full", BAND_FILL[b.tone])}
              style={{ left: `${(b.start / total) * 100}%`, width: `max(2px, calc(${((b.end - b.start) / total) * 100}% - 2px))` }}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" aria-hidden />
          {employeeName ?? "Rep"}
          {share && <span className="tabular-nums">{share.employee}%</span>}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-sky" aria-hidden />
          Caller
          {share && <span className="tabular-nums">{share.customer}%</span>}
        </span>
        {bands && bands.length > 0 && bandsLabel && (
          <span className="flex items-center gap-1.5">
            <span className="flex h-1.5 w-4 overflow-hidden rounded-full" aria-hidden>
              <span className="flex-1 bg-mood-positive" />
              <span className="flex-1 bg-mood-neutral" />
              <span className="flex-1 bg-mood-negative" />
            </span>
            {bandsLabel}
          </span>
        )}
        {!player.available && <span className="ml-auto">The recording can&apos;t be played right now.</span>}
      </div>
    </div>
  );
}
