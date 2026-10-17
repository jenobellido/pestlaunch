import type { TranscriptSegment } from "@/core/calls";

function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

export function TranscriptView({ segments }: { segments: readonly TranscriptSegment[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {segments.map((s, i) => (
        <li key={i} className="grid grid-cols-[3rem_6rem_1fr] gap-2 text-sm">
          <span className="text-zinc-400 tabular-nums">{formatTime(s.start)}</span>
          <span className="font-medium capitalize">{s.speaker}</span>
          <p>{s.text}</p>
        </li>
      ))}
    </ol>
  );
}
