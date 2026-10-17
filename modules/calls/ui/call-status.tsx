import { Badge } from "@/shared/ui/card";
import type { CallResolution, CallStatus } from "../model/types";

const STATUS: Record<CallStatus, { label: string; dot: string }> = {
  processing: { label: "Processing", dot: "bg-sky animate-pulse" },
  ready: { label: "Ready", dot: "bg-accent" },
  failed: { label: "Failed", dot: "bg-danger" },
};

const RESOLUTION: Record<CallResolution, { label: string; dot: string }> = {
  booked: { label: "Booked", dot: "bg-accent" },
  retained: { label: "Retained", dot: "bg-accent" },
  resolved: { label: "Resolved", dot: "bg-accent" },
  follow_up_needed: { label: "Follow-up needed", dot: "bg-orange" },
  unresolved: { label: "Unresolved", dot: "bg-orange" },
  cancelled: { label: "Cancelled", dot: "bg-danger" },
};

export function StatusBadge({ status }: { status: CallStatus }) {
  const s = STATUS[status];
  return <Badge dot={s.dot}>{s.label}</Badge>;
}

export function ResolutionBadge({ resolution }: { resolution: CallResolution }) {
  const r = RESOLUTION[resolution];
  return <Badge dot={r.dot}>{r.label}</Badge>;
}

export { formatTimestamp as formatDuration } from "../lib/format";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
