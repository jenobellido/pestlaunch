import { Badge } from "@/shared/ui/card";
import type { CallResolution, CallStatus, ProcessingStage } from "../model/types";

/** Just what's needed to tell where a call stands. */
type CallState = { status: CallStatus; outcome?: { resolution: CallResolution } };

const STATUS: Record<CallStatus, { label: string; dot: string }> = {
  processing: { label: "Processing", dot: "bg-sky animate-pulse" },
  ready: { label: "Ready", dot: "bg-success" },
  failed: { label: "Failed", dot: "bg-danger" },
};

const RESOLUTION: Record<CallResolution, { label: string; dot: string }> = {
  booked: { label: "Booked", dot: "bg-success" },
  retained: { label: "Retained", dot: "bg-success" },
  resolved: { label: "Resolved", dot: "bg-success" },
  follow_up_needed: { label: "Follow-up needed", dot: "bg-orange" },
  unresolved: { label: "Unresolved", dot: "bg-orange" },
  cancelled: { label: "Cancelled", dot: "bg-danger" },
};

/** The pipeline steps in order, as the UI describes them while a call is processing. */
export const PROCESSING_STEPS: { stage: ProcessingStage; label: string }[] = [
  { stage: "transcribing", label: "Transcribing the recording" },
  { stage: "analyzing", label: "Working out the call type and outcome" },
  { stage: "reviewing", label: "Scoring the call and writing coaching" },
];

export function processingLabel(stage: ProcessingStage | undefined) {
  return `${PROCESSING_STEPS.find((s) => s.stage === stage)?.label ?? "Getting started"}…`;
}

/** How a call ended, for the list filters and the stats. */
export type CallGroup = "won" | "follow_up" | "lost" | "failed" | "processing";

const RESOLUTION_GROUP: Record<CallResolution, CallGroup> = {
  booked: "won",
  retained: "won",
  resolved: "won",
  follow_up_needed: "follow_up",
  unresolved: "follow_up",
  cancelled: "lost",
};

export function callGroup(call: CallState): CallGroup {
  if (call.status === "failed") return "failed";
  if (call.status === "processing" || !call.outcome) return "processing";
  return RESOLUTION_GROUP[call.outcome.resolution];
}

export function StatusBadge({ status }: { status: CallStatus }) {
  const s = STATUS[status];
  return <Badge dot={s.dot}>{s.label}</Badge>;
}

export function ResolutionBadge({ resolution }: { resolution: CallResolution }) {
  const r = RESOLUTION[resolution];
  return <Badge dot={r.dot}>{r.label}</Badge>;
}

/** The result once a call is analyzed, otherwise its processing status. */
export function CallResultBadge({ call }: { call: CallState }) {
  return call.status === "ready" && call.outcome ? (
    <ResolutionBadge resolution={call.outcome.resolution} />
  ) : (
    <StatusBadge status={call.status} />
  );
}

export { formatTimestamp as formatDuration } from "../lib/format";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "Oct 17, 2:05 PM": the date with the time, for when a call was uploaded. */
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The file name without its extension, e.g. "monday-call.mp3" → "monday-call". */
export function callTitle(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}
