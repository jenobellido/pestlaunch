import type { TranscriptSegment } from "@/core/calls";
import { cn } from "@/shared/lib/cn";
import { formatDuration } from "./call-status";

export function TranscriptView({ segments }: { segments: readonly TranscriptSegment[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {segments.map((s, i) => (
        <li key={i} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 text-sm">
          <span className="pt-0.5 text-xs text-muted tabular-nums">{formatDuration(s.start)}</span>
          <div>
            <span
              className={cn(
                "text-xs font-medium capitalize",
                s.speaker === "employee" ? "text-accent" : s.speaker === "customer" ? "text-sky" : "text-muted",
              )}
            >
              {s.speaker}
            </span>
            <p className="mt-0.5 leading-relaxed text-fg/90">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
