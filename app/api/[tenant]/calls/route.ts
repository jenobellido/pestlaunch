import { createCallHandler, listCallsHandler } from "@/modules/calls/server";
import { getAnalysisSteps } from "@/modules/registry.server";
import { withModule } from "../_lib/with-module";

export const GET = withModule("calls", listCallsHandler);

// Processing runs after the response (see createCallHandler). A long call on a rate-limited AI
// tier can take a few minutes, so allow the platform's longest run for this route.
export const maxDuration = 300;

// Create a call for an uploaded recording ({ path, fileName }, see calls/uploads) and
// process it, running the analysis steps of every module the tenant has enabled.
export const POST = withModule("calls", async (req, { tenant }) =>
  createCallHandler(req, tenant, await getAnalysisSteps(tenant)),
);
