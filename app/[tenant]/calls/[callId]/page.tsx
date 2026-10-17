import { notFound } from "next/navigation";
import { CallDetail } from "@/modules/calls";
import { getCall } from "@/modules/calls/server";
import { CoachingPanel, getCoachingFeedback } from "@/modules/coaching";
import { getEnabledModuleIds } from "@/modules/registry";
import { ScorecardPanel, getScorecardResult } from "@/modules/scorecards";
import { requireModule } from "../../_lib/require-module";

// The app layer composes modules: the call detail comes from `calls`, and
// panels from other modules are added only when the tenant has them enabled.
export default async function Page({ params }: PageProps<"/[tenant]/calls/[callId]">) {
  const { tenant } = await requireModule(params, "calls");
  const { callId } = await params;
  const [call, enabled] = await Promise.all([
    getCall(tenant.slug, callId),
    getEnabledModuleIds(tenant.slug),
  ]);
  if (!call) notFound();

  // Panels only make sense once every analysis step has run.
  const ready = call.status === "ready";
  return (
    <CallDetail call={call}>
      {ready && enabled.has("scorecards") && <ScorecardPanel result={getScorecardResult(call.analyses)} />}
      {ready && enabled.has("coaching") && <CoachingPanel feedback={getCoachingFeedback(call.analyses)} />}
    </CallDetail>
  );
}
