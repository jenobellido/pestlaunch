import Link from "next/link";
import { ArrowLeft, AudioLines } from "lucide-react";
import { Card, CardTitle } from "@/shared/ui/card";
import { PageHeader, PageStack } from "@/shared/ui/page-header";
import { CALL_TYPE_LABELS } from "../config/call-types";
import type { CallRecord } from "../model/types";
import { formatDate, formatDuration, ResolutionBadge, StatusBadge } from "./call-status";
import { TranscriptView } from "./transcript-view";

/**
 * Call header, outcome and transcript. `children` is a slot for panels that
 * other modules contribute (scorecard, coaching); the app layer fills it.
 */
export function CallDetail({ call, children }: { call: CallRecord; children?: React.ReactNode }) {
  const meta = [
    call.callType && CALL_TYPE_LABELS[call.callType],
    call.employeeName ?? "Unknown employee",
    call.durationSec != null && formatDuration(call.durationSec),
    formatDate(call.createdAt),
  ].filter(Boolean);

  return (
    <PageStack>
      <Link
        href={`/${call.tenant}/calls`}
        className="press inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All calls
      </Link>
      <PageHeader
        title={call.fileName}
        description={meta.join(" · ")}
        icon={AudioLines}
        actions={
          call.status === "ready" && call.outcome ? (
            <ResolutionBadge resolution={call.outcome.resolution} />
          ) : (
            <StatusBadge status={call.status} />
          )
        }
      />
      {call.status === "failed" && (
        <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {call.error}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-6">
          {call.outcome && (
            <Card>
              <CardTitle>Outcome</CardTitle>
              <p className="mt-2 leading-relaxed text-fg/90">{call.outcome.summary}</p>
              {call.outcome.details.length > 0 && (
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {call.outcome.details.map((d) => (
                    <div key={d.label} className="rounded-2xl bg-chip px-4 py-3">
                      <dt className="text-xs text-muted">{d.label}</dt>
                      <dd className="mt-0.5 text-sm font-medium">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {call.outcome.followUps.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs text-muted">Follow-ups</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {call.outcome.followUps.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-orange" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
          {call.transcript && (
            <Card>
              <CardTitle className="mb-5">Transcript</CardTitle>
              <TranscriptView segments={call.transcript} />
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">{children}</aside>
      </div>
    </PageStack>
  );
}
