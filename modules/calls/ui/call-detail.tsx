import Link from "next/link";
import { AlertTriangle, ArrowLeft, AudioLines, BadgeCheck, CalendarDays, Check, Clock, Loader, UserRound } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Badge, Card, CardTitle } from "@/shared/ui/card";
import { PageHeader, PageStack } from "@/shared/ui/page-header";
import { CALL_TYPE_LABELS } from "../config/call-types";
import type { CallRecord } from "../model/types";
import { AssignCall } from "./assign-call";
import { AutoRefresh } from "./auto-refresh";
import { CallPlayer, CallPlayerProvider } from "./call-player";
import { CallResultBadge, callTitle, formatDateTime, formatDuration, PROCESSING_STEPS } from "./call-status";
import { DeleteCallButton } from "./delete-call-button";
import { RetryCallButton } from "./retry-call-button";
import { TranscriptView } from "./transcript-view";
import type { AssignableMember } from "./upload-call-form";

interface CallDetailProps {
  call: CallRecord;
  /** Signed URL for the recording, or null when it can't be played. */
  recordingUrl: string | null;
  /** Whether the viewer has the "calls.delete" permission. */
  canDelete: boolean;
  /** Team members to reassign the call to; only for viewers with "calls.assign". */
  assignableMembers?: AssignableMember[];
  /** Reasons a person should check the AI's results (empty once reviewed). */
  reviewFlags?: string[];
  /** The panel to lead with, above the outcome (the scorecard); the app layer fills it. */
  lead?: React.ReactNode;
  /** Panels after the outcome (coaching, review); the app layer fills it. */
  children?: React.ReactNode;
}

function Meta({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/** Call header, the lead panel, outcome and other modules' panels, with the recording and transcript beside them. */
export function CallDetail({
  call,
  recordingUrl,
  canDelete,
  assignableMembers,
  reviewFlags = [],
  lead,
  children,
}: CallDetailProps) {
  const title = callTitle(call.fileName);

  return (
    <PageStack>
      {call.status === "processing" && <AutoRefresh />}
      <Link
        href={`/${call.tenant}/calls`}
        className="press inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All calls
      </Link>
      <div className="flex flex-col gap-3">
        <PageHeader
          title={title}
          icon={AudioLines}
          actions={
            <div className="flex items-center gap-2">
              {call.review ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-badge-success px-2.5 py-0.5 text-xs font-medium text-on-badge-success">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  Reviewed
                </span>
              ) : (
                reviewFlags.length > 0 && (
                  <span
                    title={reviewFlags.join(" ")}
                    className="inline-flex items-center gap-1 rounded-full bg-orange/15 px-2.5 py-0.5 text-xs font-medium text-orange"
                  >
                    <AlertTriangle className="size-3.5" aria-hidden />
                    Needs review
                  </span>
                )
              )}
              <CallResultBadge call={call} />
              {canDelete && <DeleteCallButton tenantSlug={call.tenant} callId={call.id} title={title} />}
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted sm:pl-16">
          {call.callType && <Badge>{CALL_TYPE_LABELS[call.callType]}</Badge>}
          {assignableMembers ? (
            <AssignCall
              tenantSlug={call.tenant}
              callId={call.id}
              employeeId={call.employeeId}
              members={assignableMembers}
            />
          ) : (
            <Meta icon={UserRound}>{call.employeeName ?? "Unknown rep"}</Meta>
          )}
          {/* The name heard in the call is a hint; flag it when it doesn't match the assignment. */}
          {call.employeeId &&
            call.heardEmployeeName &&
            call.employeeName &&
            call.heardEmployeeName.split(/\s+/)[0].toLowerCase() !== call.employeeName.split(/\s+/)[0].toLowerCase() && (
              <span className="text-xs text-orange">The rep in the call said &ldquo;{call.heardEmployeeName}&rdquo;</span>
            )}
          {call.durationSec != null && <Meta icon={Clock}>{formatDuration(call.durationSec)}</Meta>}
          <Meta icon={CalendarDays}>{formatDateTime(call.createdAt)}</Meta>
        </div>
      </div>

      {call.status === "failed" && (
        <div role="alert" className="flex gap-3 rounded-[28px] border border-danger/30 bg-danger/10 p-5 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="font-medium text-danger">This call couldn&apos;t be fully processed</p>
            <p className="mt-1 text-fg/80">{call.error}</p>
            {(call.outcome || call.transcript) && (
              <p className="mt-2 text-muted">What finished before the error is shown below.</p>
            )}
            <RetryCallButton tenantSlug={call.tenant} callId={call.id} />
          </div>
        </div>
      )}
      {call.status === "processing" && (
        <div role="status" className="rounded-[28px] bg-card p-5 text-sm">
          <p className="font-medium">Processing this call</p>
          <p className="text-muted">Each part appears here as soon as it&apos;s ready. You can leave this page.</p>
          <ol className="mt-4 space-y-2.5">
            {PROCESSING_STEPS.map((step, i) => {
              const current = PROCESSING_STEPS.findIndex((s) => s.stage === call.stage);
              const state = i < current ? "done" : i === current ? "active" : "waiting";
              return (
                <li key={step.stage} className="flex items-center gap-2.5">
                  {state === "done" ? (
                    <Check className="size-4 shrink-0 text-accent" aria-hidden />
                  ) : state === "active" ? (
                    <Loader className="size-4 shrink-0 animate-spin text-sky motion-reduce:animate-none" aria-hidden />
                  ) : (
                    <span className="mx-1 size-2 shrink-0 rounded-full bg-line-strong" aria-hidden />
                  )}
                  <span className={state === "waiting" ? "text-muted" : "text-fg"}>
                    {step.label}
                    {state === "done" && <span className="sr-only"> (done)</span>}
                    {state === "active" && <span className="sr-only"> (in progress)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/*
        What matters most comes first: the score (the lead panel), the outcome, then coaching and
        review (other modules' panels, passed in by the app layer). The recording and transcript are reference material: on xl
        they sit in a sticky side column that scrolls on its own, and below xl they come last in
        a fixed-height box, so a long call never pushes the score off the page.
      */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {lead}
          {call.outcome && (
            <Card className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Outcome</CardTitle>
                {call.outcome.cancelReason && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      call.outcome.resolution === "retained"
                        ? "bg-badge-success text-on-badge-success"
                        : "bg-badge-danger text-on-badge-danger",
                    )}
                  >
                    {call.outcome.resolution === "retained" ? "Saved" : "Lost"} · {call.outcome.cancelReason}
                  </span>
                )}
              </div>
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
                <div className="mt-5 rounded-2xl border border-orange/30 bg-orange/10 px-4 py-3">
                  <p className="text-xs font-medium text-orange">Follow-ups</p>
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
          {children}
        </div>
        {call.transcript && call.transcript.length > 0 && (
          <CallPlayerProvider src={recordingUrl} durationSec={call.durationSec}>
            <section
              aria-label="Recording and transcript"
              className="flex max-h-[34rem] min-w-0 flex-col overflow-hidden rounded-[28px] bg-card xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)]"
            >
              <div className="shrink-0 border-b border-line p-5">
                <CallPlayer segments={call.transcript} employeeName={call.employeeName} />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                <TranscriptView segments={call.transcript} employeeName={call.employeeName} />
              </div>
            </section>
          </CallPlayerProvider>
        )}
      </div>
    </PageStack>
  );
}
