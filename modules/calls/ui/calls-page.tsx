import { Phone } from "lucide-react";
import { PageHeader, PageStack } from "@/shared/ui/page-header";
import { CALL_TYPE_LABELS } from "../config/call-types";
import type { CallRecord } from "../model/types";
import { listCalls } from "../server/call-repository";
import { CallList, type CallListItem } from "./call-list";
import { CallStats } from "./call-stats";
import { AutoRefresh } from "./auto-refresh";
import { callGroup, callTitle, formatDateTime, formatDuration, processingLabel } from "./call-status";
import { UploadCallForm } from "./upload-call-form";

interface CallsPageProps {
  tenantSlug: string;
  /**
   * Renders a call's score for the list. Passed in by the app layer when the
   * scorecards module is on, since modules can't import each other.
   */
  score?: (call: CallRecord) => React.ReactNode;
}

function subtitleOf(call: CallRecord) {
  if (call.status === "failed") return call.error ?? "Processing failed.";
  if (call.status === "processing") return processingLabel(call.stage);
  return call.outcome?.summary ?? "";
}

export async function CallsPage({ tenantSlug, score }: CallsPageProps) {
  const calls = await listCalls(tenantSlug);

  // Everything the list shows is prepared here, so dates are formatted once, on the server.
  const items: CallListItem[] = calls.map((call) => {
    const type = call.callType ? CALL_TYPE_LABELS[call.callType] : null;
    return {
      id: call.id,
      href: `/${tenantSlug}/calls/${call.id}`,
      title: callTitle(call.fileName),
      subtitle: subtitleOf(call),
      type,
      employee: call.employeeName,
      duration: call.durationSec != null ? formatDuration(call.durationSec) : null,
      date: formatDateTime(call.createdAt),
      status: call.status,
      outcome: call.outcome ? { resolution: call.outcome.resolution } : undefined,
      group: callGroup(call),
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
      />
      <UploadCallForm tenantSlug={tenantSlug} />
      {calls.length > 0 && <CallStats calls={calls} />}
      <CallList items={items} showScore={score != null} />
    </PageStack>
  );
}
