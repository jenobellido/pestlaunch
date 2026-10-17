import { PageHeader } from "@/shared/ui/page-header";
import { CALL_TYPE_LABELS } from "../config/call-types";
import type { CallRecord } from "../model/types";
import { TranscriptView } from "./transcript-view";

/**
 * Call header, outcome and transcript. `children` is a slot for panels that
 * other modules contribute (scorecard, coaching); the app layer fills it.
 */
export function CallDetail({ call, children }: { call: CallRecord; children?: React.ReactNode }) {
  return (
    <>
      <PageHeader title={call.fileName} />
      {call.status === "failed" && <p className="mb-6 text-red-600">{call.error}</p>}
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-6">
          {call.outcome && (
            <div>
              <p className="text-sm text-zinc-500">
                {call.callType && CALL_TYPE_LABELS[call.callType]} · {call.employeeName ?? "Unknown employee"}
              </p>
              <p className="mt-2">{call.outcome.summary}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {call.outcome.details.map((d) => (
                  <div key={d.label}>
                    <dt className="text-zinc-500">{d.label}</dt>
                    <dd>{d.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {call.transcript && <TranscriptView segments={call.transcript} />}
        </section>
        <aside className="flex flex-col gap-6">{children}</aside>
      </div>
    </>
  );
}
