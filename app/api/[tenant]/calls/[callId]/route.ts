import { getCallHandler } from "@/modules/calls/server";
import { withModule } from "../../_lib/with-module";

export async function GET(req: Request, ctx: RouteContext<"/api/[tenant]/calls/[callId]">) {
  const { callId } = await ctx.params;
  return withModule("calls", (_req, { tenant }) => getCallHandler(tenant, callId))(req, ctx);
}
