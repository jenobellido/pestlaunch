import { notFound } from "next/navigation";
import { activeCallTypes, findCallType } from "@/core/calls";
import { getCallTypes } from "@/core/calls/server";
import { can, listMembers } from "@/core/tenancy";
import { CallDetail, callReviewFlags } from "@/modules/calls";
import {
  callScope,
  getCall,
  getCallRecordingUrl,
  listTasks,
} from "@/modules/calls/server";
import { CoachingPanel, getCoachingFeedback } from "@/modules/coaching";
import { listPlays } from "@/modules/coaching/server";
import { MakeFocusButton } from "../../team/_components/plays";
import { getCallSentiment, SentimentPanel, sentimentRanges } from "@/modules/sentiment";
import { getEnabledModuleIds } from "@/modules/registry";
import {
  ScorecardPanel,
  getScorecardResult,
  scorecardReviewFlag,
} from "@/modules/scorecards";
import { requireModule } from "../../_lib/require-module";
import { CallTasks } from "../../_components/tasks";
import { ReviewPanel, ScoreItemToggle } from "./_components/review-panel";

// Correcting a call type re-scores it in the background (server actions on this page).
export const maxDuration = 300;

// The app layer composes modules: the call detail comes from `calls`, and
// panels from other modules are added only when the tenant has them enabled.
// The score leads, above the outcome; coaching follows and corrections come last.
export default async function Page({
  params,
}: PageProps<"/[tenant]/calls/[callId]">) {
  const access = await requireModule(params, "calls");
  const { tenant, user, permissions } = access;
  const { callId } = await params;
  const canAssign = can(access, "calls.assign");
  // Members without "calls.view_all" can only open their own calls; others 404.
  const call = await getCall(
    tenant.slug,
    callId,
    callScope({ userId: user.id, permissions }),
  );
  if (!call) notFound();

  // People who manage coaching can turn a call's coaching into a focus for its rep.
  const canCoach = can(access, "coaching.manage") && !!call.employeeId;
  const [enabled, recordingUrl, members, tasks, catalog, repPlays] = await Promise.all([
    getEnabledModuleIds(tenant.slug),
    getCallRecordingUrl(tenant.slug, callId),
    canAssign ? listMembers(tenant.id) : Promise.resolve(null),
    listTasks(tenant.id, { callId }),
    getCallTypes(tenant.id),
    canCoach ? listPlays(tenant.id, { assigneeId: call.employeeId! }) : Promise.resolve([]),
  ]);
  const focusFor = canCoach ? { id: call.employeeId!, name: call.employeeName ?? "this rep" } : null;
  const openFocus = new Set(repPlays.filter((p) => p.status === "open").map((p) => p.title));
  // A reviewer picks from the company's enabled types, plus the call's current one.
  const reviewTypes = activeCallTypes(catalog)
    .concat(call.callType && !activeCallTypes(catalog).some((t) => t.key === call.callType) ? [findCallType(catalog, call.callType)] : [])
    .map((t): [string, string] => [t.key, t.name]);

  // Panels only make sense once every analysis step has run.
  const ready = call.status === "ready";
  const score = enabled.has("scorecards")
    ? getScorecardResult(call.analyses)
    : null;
  const canReview = ready && can(access, "calls.review");
  // Sentiment draws under the player's timeline as well as in its own panel.
  const sentiment = ready && enabled.has("sentiment") ? getCallSentiment(call.analyses) : null;
  const sentimentBands = sentiment
    ? sentimentRanges(sentiment.turns).map((r) => ({
        ...r,
        tone: r.sentiment,
        label: r.sentiment === "positive" ? "Positive" : r.sentiment === "negative" ? "Negative" : "Neutral",
      }))
    : undefined;
  // A reviewed call is trusted as is; otherwise flag what a person should check.
  const reviewFlags = call.review
    ? []
    : [
        ...callReviewFlags(call),
        score ? scorecardReviewFlag(score) : null,
      ].filter((f): f is string => !!f);

  return (
    <CallDetail
      call={call}
      recordingUrl={recordingUrl}
      canDelete={can(access, "calls.delete")}
      assignableMembers={members?.map((m) => ({
        id: m.userId,
        name: m.displayName,
      }))}
      reviewFlags={ready && can(access, "calls.review") ? reviewFlags : []}
      timelineBands={sentimentBands}
      timelineBandsLabel={sentimentBands ? "Sentiment" : undefined}
      lead={
        <>
          {/* Who owns this call's follow-up, before anything else. */}
          <CallTasks
            slug={tenant.slug}
            tasks={tasks}
            canManage={canAssign}
            currentUserId={user.id}
            members={members?.map((m) => ({ id: m.userId, name: m.displayName }))}
          />
          {ready && enabled.has("scorecards") && (
            <ScorecardPanel
              result={score}
              rubricHref={`/${tenant.slug}/scorecards`}
              renderMark={
                canReview
                  ? (index, item) => (
                      <ScoreItemToggle
                        slug={tenant.slug}
                        callId={call.id}
                        index={index}
                        passed={item.passed}
                        name={item.item}
                      />
                    )
                  : undefined
              }
            />
          )}
        </>
      }
    >
      {ready && enabled.has("coaching") && (
        <CoachingPanel
          feedback={getCoachingFeedback(call.analyses)}
          improvementAction={
            focusFor
              ? (p) => (
                  <MakeFocusButton
                    slug={tenant.slug}
                    assignee={focusFor}
                    title={p.point}
                    detail={`Try: ${p.suggestion}`}
                    alreadyAssigned={openFocus.has(p.point)}
                  />
                )
              : undefined
          }
        />
      )}
      {sentiment && call.transcript && (
        <SentimentPanel sentiment={sentiment} transcript={call.transcript} durationSec={call.durationSec} />
      )}
      {canReview && (
        <ReviewPanel
          slug={tenant.slug}
          callId={call.id}
          callType={call.callType ?? null}
          callTypes={reviewTypes}
          resolution={call.outcome?.resolution ?? null}
          flags={reviewFlags}
          review={call.review ?? null}
        />
      )}
    </CallDetail>
  );
}
