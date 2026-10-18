"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { TranscriptSegment } from "@/core/calls";
import { cn } from "@/shared/lib/cn";
import { usePlayer } from "./call-player";
import { formatDuration } from "./call-status";

const SPEAKER_LABEL = { employee: "Rep", customer: "Caller", unknown: "Other" } as const;

/** Wraps each case-insensitive match of `query` in a <mark>. */
function highlight(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-orange/30 px-0.5 text-fg">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function TranscriptView({
  segments,
  employeeName,
}: {
  segments: readonly TranscriptSegment[];
  employeeName: string | null;
}) {
  const player = usePlayer();
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const needle = query.trim().toLowerCase();
  const matches = needle ? segments.filter((s) => s.text.toLowerCase().includes(needle)).length : 0;

  // The line being played: the last one that started at or before the playhead.
  let active = -1;
  if (player.time > 0 || player.playing) {
    for (let i = 0; i < segments.length && segments[i].start <= player.time + 0.05; i++) active = i;
  }

  // Keep the playing line in view, without fighting someone who is reading elsewhere while paused.
  useEffect(() => {
    if (!player.playing || active < 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [active, player.playing]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium">Transcript</h2>
        <div className="flex items-center gap-3">
          {needle && (
            <span className="text-xs text-muted tabular-nums" role="status">
              {matches} {matches === 1 ? "line" : "lines"}
            </span>
          )}
          <label className="relative block w-48 sm:w-56">
            <span className="sr-only">Find in transcript</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find in transcript"
              className="h-9 w-full rounded-full border border-line bg-card pr-8 pl-8 text-sm outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear"
                className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-fg"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </label>
        </div>
      </div>

      <ol ref={listRef} className="-mx-3 flex flex-col">
        {segments.map((s, i) => {
          const isActive = i === active;
          const dimmed = needle !== "" && !s.text.toLowerCase().includes(needle);
          return (
            <li
              key={i}
              className={cn(
                "grid scroll-my-28 grid-cols-[3.25rem_minmax(0,1fr)] gap-2 rounded-2xl px-3 py-2.5 text-sm transition-[background-color,opacity] duration-200",
                isActive && "bg-accent/10",
                dimmed && "opacity-40",
              )}
              aria-current={isActive ? "true" : undefined}
            >
              <button
                type="button"
                onClick={() => player.seek(s.start, true)}
                disabled={!player.available}
                aria-label={`Play from ${formatDuration(s.start)}`}
                className={cn(
                  "h-6 self-start rounded-full text-left text-xs tabular-nums transition-colors focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none enabled:hover:text-accent disabled:cursor-default",
                  isActive ? "font-medium text-accent" : "text-muted",
                )}
              >
                {formatDuration(s.start)}
              </button>
              <div className="min-w-0">
                <span
                  className={cn(
                    "text-xs font-medium",
                    s.speaker === "employee" ? "text-accent" : s.speaker === "customer" ? "text-sky" : "text-muted",
                  )}
                >
                  {s.speaker === "employee" && employeeName ? employeeName : SPEAKER_LABEL[s.speaker]}
                </span>
                <p className="mt-0.5 leading-relaxed text-fg/90">{highlight(s.text, needle)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
