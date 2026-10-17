import "server-only";
import type { CallAnalysisStep } from "@/core/calls";
import type { ModuleRouteHandler } from "@/core/modules";
import { getCall, listCalls } from "./call-repository";
import { processCall } from "./process-call";

export const listCallsHandler: ModuleRouteHandler = async (_req, { tenant }) => {
  return Response.json({ data: await listCalls(tenant) });
};

export async function getCallHandler(tenant: string, callId: string): Promise<Response> {
  const call = await getCall(tenant, callId);
  if (!call) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: call });
}

export async function createCallHandler(
  req: Request,
  tenant: string,
  steps: readonly CallAnalysisStep[],
): Promise<Response> {
  const form = await req.formData();
  const audio = form.get("recording");
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: "Attach an audio file as 'recording'." }, { status: 400 });
  }
  const call = await processCall(tenant, audio, steps);
  return Response.json({ data: call }, { status: call.status === "failed" ? 422 : 201 });
}
