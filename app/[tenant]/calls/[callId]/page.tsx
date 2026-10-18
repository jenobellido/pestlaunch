import { notFound } from "next/navigation";
import { can, listMembers } from "@/core/tenancy";
import { CallDetail, callReviewFlags } from "@/modules/calls";
import { callScope, getCall, getCallRecordingUrl } from "@/modules/calls/server";
import { CoachingPanel, getCoachingFeedback } from "@/modules/coaching";
import { getEnabledModuleIds } from "@/modules/registry";
import { ScorecardPanel, getScorecardResult, scorecardReviewFlag } from "@/modules/scorecards";
import { requireModule } from "../../_lib/require-module";
import { ReviewPanel, ScoreItemToggle } from "./_components/review-panel";

// Correcting a call type re-scores it in the background (server actions on this page).
export const maxDuration = 300;

// The app layer composes modules: the call detail comes from `calls`, and
// panels from other modules are added only when the tenant has them enabled.
export default async function Page({ params }: PageProps<"/[tenant]/calls/[callId]">) {
  const access = await requireModule(params, "calls");
  const { tenant, user, permissions } = access;
  const { callId } = await params;
  const canAssign = can(access, "calls.assign");
  // Members without "calls.view_all" can only open their own calls; others 404.
  const call = await getCall(tenant.slug, callId, callScope({ userId: user.id, permissions }));
  if (!call) notFound();

  const [enabled, recordingUrl, members] = await Promise.all([
    getEnabledModuleIds(tenant.slug),
    getCallRecordingUrl(tenant.slug, callId),
    canAssign ? listMembers(tenant.id) : Promise.resolve(null),
  ]);

  // Panels only make sense once every analysis step has run.
  const ready = call.status === "ready";
  const score = enabled.has("scorecards") ? getScorecardResult(call.analyses) : null;
  const canReview = ready && can(access, "calls.review");
  // A reviewed call is trusted as is; otherwise flag what a person should check.
  const reviewFlags = call.review
    ? []
    : [...callReviewFlags(call), score ? scorecardReviewFlag(score) : null].filter((f): f is string => !!f);

  return (
    <CallDetail
      call={call}
      recordingUrl={recordingUrl}
      canDelete={can(access, "calls.delete")}
      assignableMembers={members?.map((m) => ({ id: m.userId, name: m.displayName }))}
      reviewFlags={ready ? reviewFlags : []}
    >
      {canReview && (
        <ReviewPanel
          slug={tenant.slug}
          callId={call.id}
          callType={call.callType ?? null}
          resolution={call.outcome?.resolution ?? null}
          flags={reviewFlags}
          review={call.review ?? null}
        />
      )}
      {ready && enabled.has("scorecards") && (
        <ScorecardPanel
          result={score}
          rubricHref={`/${tenant.slug}/scorecards`}
          renderMark={
            canReview
              ? (index, item) => (
                  <ScoreItemToggle slug={tenant.slug} callId={call.id} index={index} passed={item.passed} name={item.item} />
                )
              : undefined
          }
        />
      )}
      {ready && enabled.has("coaching") && <CoachingPanel feedback={getCoachingFeedback(call.analyses)} />}
    </CallDetail>
  );
}
