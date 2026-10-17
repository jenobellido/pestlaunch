import Link from "next/link";
import { AudioLines, ChevronRight, Phone } from "lucide-react";
import { EmptyState } from "@/shared/ui/card";
import { CALL_TYPE_LABELS } from "../config/call-types";
import type { CallRecord } from "../model/types";
import { formatDate, formatDuration, ResolutionBadge, StatusBadge } from "./call-status";

const COLUMNS = "md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_150px_120px_24px]";

export function CallList({ tenantSlug, calls }: { tenantSlug: string; calls: CallRecord[] }) {
  if (calls.length === 0)
    return (
      <EmptyState icon={Phone} title="No calls yet">
        Upload a call recording above. It&apos;s transcribed, classified, scored and coached in about a minute.
      </EmptyState>
    );

  return (
    <section className="overflow-hidden rounded-[28px] bg-card">
      <div className={`hidden gap-4 border-b border-line px-6 py-3 text-xs text-muted md:grid ${COLUMNS}`}>
        <span>Call</span>
        <span>Employee</span>
        <span>Result</span>
        <span>Date</span>
        <span />
      </div>
      <ul>
        {calls.map((c) => (
          <li key={c.id} className="border-b border-line last:border-b-0">
            <Link
              href={`/${tenantSlug}/calls/${c.id}`}
              className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-card-2 sm:px-6 ${COLUMNS}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chip text-muted">
                  <AudioLines className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.fileName}</span>
                  <span className="block truncate text-sm text-muted">
                    {c.callType ? CALL_TYPE_LABELS[c.callType] : "Unclassified"}
                    {c.durationSec != null && ` · ${formatDuration(c.durationSec)}`}
                  </span>
                </span>
              </span>
              <span className="hidden truncate text-sm text-muted md:block">{c.employeeName ?? "Unknown"}</span>
              <span className="justify-self-end md:justify-self-start">
                {c.status === "ready" && c.outcome ? (
                  <ResolutionBadge resolution={c.outcome.resolution} />
                ) : (
                  <StatusBadge status={c.status} />
                )}
              </span>
              <span className="hidden text-sm text-muted tabular-nums md:block">{formatDate(c.createdAt)}</span>
              <ChevronRight
                className="hidden size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg md:block"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
