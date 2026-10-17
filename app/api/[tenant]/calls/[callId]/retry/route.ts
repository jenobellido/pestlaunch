import { retryCallHandler } from "@/modules/calls/server";
import { getAnalysisSteps } from "@/modules/registry.server";
import { withModule } from "../../../_lib/with-module";

// Like uploading, the pipeline runs after the response and can take a few minutes.
export const maxDuration = 300;

/** Runs a failed or stalled call through processing again. */
export async function POST(req: Request, ctx: RouteContext<"/api/[tenant]/calls/[callId]/retry">) {
  const { callId } = await ctx.params;
  return withModule("calls", async (_req, { tenant }) =>
    retryCallHandler(tenant, callId, await getAnalysisSteps(tenant)),
  )(req, ctx);
}
