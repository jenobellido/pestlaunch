import { assignCallHandler, deleteCallHandler, getCallHandler } from "@/modules/calls/server";
import { withModule } from "../../_lib/with-module";

type Ctx = RouteContext<"/api/[tenant]/calls/[callId]">;

export async function GET(req: Request, ctx: Ctx) {
  const { callId } = await ctx.params;
  return withModule("calls", (_req, { tenant, userId, permissions }) =>
    getCallHandler(tenant, callId, { userId, permissions }),
  )(req, ctx);
}

/** Reassigns the call: { employeeId } or { employeeId: null }. Needs "calls.assign". */
export async function PATCH(req: Request, ctx: Ctx) {
  const { callId } = await ctx.params;
  return withModule("calls", (r, { tenant, userId, permissions }) =>
    assignCallHandler(r, tenant, callId, { userId, permissions }),
  )(req, ctx);
}

/** Deletes the call and its recording. Needs "calls.delete". */
export async function DELETE(req: Request, ctx: Ctx) {
  const { callId } = await ctx.params;
  return withModule("calls", (_req, { tenant, userId, permissions }) =>
    deleteCallHandler(tenant, callId, { userId, permissions }),
  )(req, ctx);
}
