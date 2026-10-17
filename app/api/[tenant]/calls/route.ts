import { createCallHandler, listCallsHandler } from "@/modules/calls/server";
import { getAnalysisSteps } from "@/modules/registry.server";
import { withModule } from "../_lib/with-module";

export const GET = withModule("calls", listCallsHandler);

// Upload a recording (multipart field "recording") and process it, running the
// analysis steps of every module the tenant has enabled.
export const POST = withModule("calls", async (req, { tenant }) =>
  createCallHandler(req, tenant, await getAnalysisSteps(tenant)),
);
