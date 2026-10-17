import { CALL_TYPE_LABELS } from "@/modules/calls";
import { callScope, listCalls, toCsv } from "@/modules/calls/server";
import { getScorecardResult } from "@/modules/scorecards";
import { withModule } from "../../_lib/with-module";

/** Every call the member can see, as a CSV for spreadsheets. Respects calls.view_all. */
export const GET = withModule("calls", async (_req, { tenant, userId, permissions }) => {
  const calls = await listCalls(tenant, callScope({ userId, permissions }));
  const csv = toCsv(
    ["Date", "Call", "Type", "Rep", "Status", "Outcome", "Cancel reason", "Score", "Out of", "Grade", "Talk (min)", "Summary", "Follow-ups"],
    calls.map((c) => {
      const score = getScorecardResult(c.analyses);
      return [
        c.createdAt.slice(0, 10),
        c.fileName,
        c.callType ? CALL_TYPE_LABELS[c.callType] : null,
        c.employeeName,
        c.status,
        c.outcome?.resolution.replace(/_/g, " ") ?? null,
        c.outcome?.cancelReason ?? null,
        score?.points ?? null,
        score?.maxPoints ?? null,
        score?.grade ?? null,
        c.durationSec != null ? Math.round((c.durationSec / 60) * 10) / 10 : null,
        c.outcome?.summary ?? null,
        c.outcome?.followUps.join("; ") ?? null,
      ];
    }),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tenant}-calls-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
