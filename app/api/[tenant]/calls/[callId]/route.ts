import { deleteCallHandler, getCallHandler } from "@/modules/calls/server";
import { withModule } from "../../_lib/with-module";

export async function GET(req: Request, ctx: RouteContext<"/api/[tenant]/calls/[callId]">) {
  const { callId } = await ctx.params;
  return withModule("calls", (_req, { tenant }) => getCallHandler(tenant, callId))(req, ctx);
}

/** Owners and managers can delete a call and its recording. */
export async function DELETE(req: Request, ctx: RouteContext<"/api/[tenant]/calls/[callId]">) {
  const { callId } = await ctx.params;
  return withModule("calls", (_req, { tenant, role }) =>
    role === "rep"
      ? Promise.resolve(Response.json({ error: "Only owners and managers can delete calls." }, { status: 403 }))
      : deleteCallHandler(tenant, callId),
  )(req, ctx);
}
