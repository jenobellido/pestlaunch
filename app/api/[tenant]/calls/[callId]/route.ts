import { getCallHandler } from "@/modules/calls/server";
import { isModuleEnabled } from "@/modules/registry";

export async function GET(_req: Request, ctx: RouteContext<"/api/[tenant]/calls/[callId]">) {
  const { tenant, callId } = await ctx.params;
  if (!(await isModuleEnabled(tenant, "calls"))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return getCallHandler(tenant, callId);
}
