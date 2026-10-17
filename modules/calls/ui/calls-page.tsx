import Link from "next/link";
import { Download, Phone, Search, X } from "lucide-react";
import { PageHeader, PageStack } from "@/shared/ui/page-header";
import { CALL_TYPE_GROUP, CALL_TYPE_LABELS } from "../config/call-types";
import type { CallRecord } from "../model/types";
import { listCalls, searchTranscripts, type CallScope } from "../server/call-repository";
import { CallList, type CallListItem } from "./call-list";
import { CallStats } from "./call-stats";
import { AutoRefresh } from "./auto-refresh";
import { callGroup, callTitle, formatDateTime, formatDuration, processingLabel } from "./call-status";
import { UploadCallForm, type AssignableMember } from "./upload-call-form";

interface CallsPageProps {
  tenantSlug: string;
  /** Which calls this member may see (see callScope). */
  scope: CallScope;
  /** Whether this member may upload calls. */
  canUpload: boolean;
  /** Team members to choose from on upload; only for members who may assign calls. */
  members?: AssignableMember[];
  /**
   * Renders a call's score for the list. Passed in by the app layer when the
   * scorecards module is on, since modules can't import each other.
   */
  score?: (call: CallRecord) => React.ReactNode;
  /** Search inside transcripts (?q=); only matching calls are listed, with the matching line. */
  transcriptQuery?: string;
}

function subtitleOf(call: CallRecord) {
  if (call.status === "failed") return call.error ?? "Processing failed.";
  if (call.status === "processing") return processingLabel(call.stage);
  return call.outcome?.summary ?? "";
}

export async function CallsPage({ tenantSlug, scope, canUpload, members, score, transcriptQuery }: CallsPageProps) {
  const query = transcriptQuery?.trim() ?? "";
  const [allCalls, matches] = await Promise.all([
    listCalls(tenantSlug, scope),
    query ? searchTranscripts(tenantSlug, query, scope) : Promise.resolve(null),
  ]);
  const matchByCall = new Map(matches?.map((m) => [m.callId, m]));
  const calls = matches ? allCalls.filter((c) => matchByCall.has(c.id)) : allCalls;
  const speakerName = (c: CallRecord, speaker: string) =>
    speaker === "employee" ? (c.employeeName ?? "Employee") : speaker === "customer" ? "Customer" : "Other";

  // Everything the list shows is prepared here, so dates are formatted once, on the server.
  const items: CallListItem[] = calls.map((call) => {
    const type = call.callType ? CALL_TYPE_LABELS[call.callType] : null;
    return {
      id: call.id,
      href: `/${tenantSlug}/calls/${call.id}`,
      title: callTitle(call.fileName),
      subtitle: matchByCall.has(call.id)
        ? `${speakerName(call, matchByCall.get(call.id)!.speaker)} at ${formatDuration(matchByCall.get(call.id)!.start)}: "${matchByCall.get(call.id)!.text}"`
        : subtitleOf(call),
      type,
      employee: call.employeeName,
      duration: call.durationSec != null ? formatDuration(call.durationSec) : null,
      date: formatDateTime(call.createdAt),
      status: call.status,
      outcome: call.outcome ? { resolution: call.outcome.resolution } : undefined,
      group: callGroup(call),
      typeGroup: call.callType ? CALL_TYPE_GROUP[call.callType] : null,
      repKey: call.employeeId ?? (call.employeeName ? `heard:${call.employeeName.toLowerCase()}` : null),
      createdAtMs: new Date(call.createdAt).getTime(),
      search: [call.fileName, type, call.employeeName, call.outcome?.summary].filter(Boolean).join(" ").toLowerCase(),
      score: score && call.status === "ready" ? score(call) : undefined,
    };
  });

  return (
    <PageStack>
      {/* Processing runs on the server after upload; keep the list current until it's done. */}
      {calls.some((c) => c.status === "processing") && <AutoRefresh everyMs={5000} />}
      <PageHeader
        title="Calls"
        description="Upload a recording to get its transcript, outcome, score and coaching."
        icon={Phone}
        actions={
          allCalls.length > 0 && (
            <a
              href={`/api/${tenantSlug}/calls/export`}
              className="press inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm hover:bg-card"
            >
              <Download className="size-4" aria-hidden />
              Export CSV
            </a>
          )
        }
      />
      {canUpload && <UploadCallForm tenantSlug={tenantSlug} members={members} />}
      {allCalls.length > 0 && <CallStats calls={allCalls} />}
      {allCalls.length > 0 && (
        <form role="search" action={`/${tenantSlug}/calls`} className="flex flex-wrap items-center gap-3">
          <label className="relative block min-w-0 flex-1 sm:max-w-md">
            <span className="sr-only">Search what was said in calls</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search what was said, e.g. termites"
              className="h-11 w-full rounded-full border border-line bg-card pr-4 pl-11 text-sm outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </label>
          {matches && (
            <p className="flex items-center gap-2 text-sm text-muted">
              {matches.length} {matches.length === 1 ? "call mentions" : "calls mention"} &ldquo;{query}&rdquo;
              <Link
                href={`/${tenantSlug}/calls`}
                className="press inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-xs text-fg hover:bg-card-2"
              >
                <X className="size-3" aria-hidden />
                Clear
              </Link>
            </p>
          )}
        </form>
      )}
      {matches && calls.length === 0 ? (
        <p className="rounded-[28px] bg-card px-6 py-12 text-center text-sm text-muted">
          No calls mention &ldquo;{query}&rdquo;. Try another word.
        </p>
      ) : (
        <CallList items={items} showScore={score != null} />
      )}
    </PageStack>
  );
}
