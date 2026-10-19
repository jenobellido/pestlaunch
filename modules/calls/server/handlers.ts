import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { activeCallTypes, type CallAnalysisStep } from "@/core/calls";
import { getCallTypes } from "@/core/calls/server";
import type { ModuleRouteHandler } from "@/core/modules";
import {
  createRecordingUpload,
  deleteRecording,
  getRecordingSize,
  isTenantRecordingPath,
  MAX_RECORDING_BYTES,
  RECORDING_EXTENSIONS,
} from "@/core/storage";
import { getTenantBySlug, listMembers, type Permission } from "@/core/tenancy";
import {
  claimCallForRetry,
  deleteCallRow,
  getCall,
  insertCall,
  listCalls,
  setCallEmployee,
  type CallScope,
} from "./call-repository";
import { processCall } from "./process-call";

// Uploading is two requests, so recordings go straight to storage, not through this API:
//   1. POST /calls/uploads  → a private path plus a one-time upload token
//   2. the browser uploads the file to storage with the token
//   3. POST /calls          → creates the call for that path and returns it as "processing";
//                             the pipeline runs after the response (next/server `after`)

const fail = (error: string, status: number) => Response.json({ error }, { status });

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

const uploadRequest = z.object({
  fileName: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
});

const createRequest = z.object({
  fileName: z.string().trim().min(1).max(255),
  path: z.string().min(1).max(512),
  /** Who the call belongs to. Only people allowed to assign calls can set it; null = work it out from the call. */
  employeeId: z.uuid().nullable().optional(),
  /** The call type, when the uploader picked one; null or missing = the AI decides. */
  callType: z.string().trim().min(1).max(64).nullable().optional(),
});

const assignRequest = z.object({ employeeId: z.uuid().nullable() });

/** The signed-in member making the request. */
export interface Viewer {
  userId: string;
  permissions: readonly Permission[];
}

/** Without "calls.view_all" a member only sees their own calls and the calls they have a follow-up on. */
export function callScope(viewer: Viewer): CallScope {
  return viewer.permissions.includes("calls.view_all") ? {} : { viewerId: viewer.userId };
}

const forbidden = (action: string) => fail(`You don't have permission to ${action}.`, 403);

async function isMember(tenantId: string, userId: string) {
  return (await listMembers(tenantId)).some((m) => m.userId === userId);
}

async function tenantIdOf(slug: string) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) throw new Error(`Unknown tenant ${slug}`);
  return tenant.id;
}

export const listCallsHandler: ModuleRouteHandler = async (_req, { tenant, userId, permissions }) => {
  return Response.json({ data: await listCalls(tenant, callScope({ userId, permissions })) });
};

export async function getCallHandler(tenant: string, callId: string, viewer: Viewer): Promise<Response> {
  const call = await getCall(tenant, callId, callScope(viewer));
  if (!call) return fail("Not found", 404);
  return Response.json({ data: call });
}

export const createUploadHandler: ModuleRouteHandler = async (req, { tenant, permissions }) => {
  if (!permissions.includes("calls.upload")) return forbidden("upload calls");
  const body = uploadRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Send the file's name and size.", 400);

  const extension = extensionOf(body.data.fileName);
  if (!(RECORDING_EXTENSIONS as readonly string[]).includes(extension)) {
    return fail("Upload an audio file, such as MP3, WAV or M4A.", 400);
  }
  if (body.data.size > MAX_RECORDING_BYTES) {
    return fail(`Recordings can be up to ${MAX_RECORDING_BYTES / 1024 / 1024} MB.`, 413);
  }

  const upload = await createRecordingUpload(await tenantIdOf(tenant), extension);
  return Response.json({ data: upload }, { status: 201 });
};

export async function createCallHandler(
  req: Request,
  tenant: string,
  viewer: Viewer,
  steps: readonly CallAnalysisStep[],
): Promise<Response> {
  if (!viewer.permissions.includes("calls.upload")) return forbidden("upload calls");
  const body = createRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Send the uploaded recording's path and file name.", 400);

  const id = await tenantIdOf(tenant);
  const { path, fileName } = body.data;
  if (!isTenantRecordingPath(id, path)) return fail("Not found", 404);
  if ((await getRecordingSize(path)) === null) return fail("Upload the recording before processing it.", 409);

  // A member who can't assign calls is always the call's employee, whatever the recording says.
  // Someone who can picks the employee, or leaves it to be matched from the name heard in the call.
  let employeeId: string | null = viewer.userId;
  if (viewer.permissions.includes("calls.assign")) {
    employeeId = body.data.employeeId ?? null;
    if (employeeId && !(await isMember(id, employeeId))) return fail("That person isn't on the team.", 400);
  }

  // A type picked on upload must be one of the company's enabled types; it's then locked.
  const callType = body.data.callType ?? null;
  if (callType && !activeCallTypes(await getCallTypes(id)).some((t) => t.key === callType)) {
    return fail("That call type isn't available. Pick another or let the AI decide.", 400);
  }

  const row = await insertCall({ tenantId: id, fileName, recordingPath: path, employeeId, callType });
  // Processing takes from seconds to minutes, so it runs after the response. The UI shows
  // the call as processing and refreshes until it's ready.
  after(() =>
    processCall({ id: row.id, tenant, tenantId: id, fileName, recordingPath: path, employeeId, lockedType: row.callType }, steps),
  );

  return Response.json({ data: await getCall(tenant, row.id) }, { status: 202 });
}

/** Runs a failed or stalled call again, reusing its transcript when it has one. */
export async function retryCallHandler(
  tenant: string,
  callId: string,
  viewer: Viewer,
  steps: readonly CallAnalysisStep[],
): Promise<Response> {
  if (!viewer.permissions.includes("calls.upload")) return forbidden("process calls");
  const scope = callScope(viewer);
  const row = await claimCallForRetry(tenant, callId, scope);
  if (!row) {
    const call = await getCall(tenant, callId, scope);
    return call ? fail("This call is already processing or finished.", 409) : fail("Not found", 404);
  }
  const transcript = row.transcript ?? undefined;
  after(() =>
    processCall(
      {
        id: row.id,
        tenant,
        tenantId: row.tenantId,
        fileName: row.fileName,
        recordingPath: row.recordingPath,
        employeeId: row.employeeId,
        lockedType: row.typeLocked ? row.callType : null,
      },
      steps,
      { transcript },
    ),
  );
  return Response.json({ data: await getCall(tenant, row.id, scope) }, { status: 202 });
}

/** Moves a call to another team member, or unassigns it. */
export async function assignCallHandler(req: Request, tenant: string, callId: string, viewer: Viewer): Promise<Response> {
  if (!viewer.permissions.includes("calls.assign")) return forbidden("assign calls");
  const body = assignRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Send the team member's id, or null to unassign.", 400);
  // Only calls the viewer can see can be moved; otherwise it reads as not found.
  if (!(await getCall(tenant, callId, callScope(viewer)))) return fail("Not found", 404);
  const { employeeId } = body.data;
  if (employeeId && !(await isMember(await tenantIdOf(tenant), employeeId))) {
    return fail("That person isn't on the team.", 400);
  }
  if (!(await setCallEmployee(tenant, callId, employeeId))) return fail("Not found", 404);
  return Response.json({ data: await getCall(tenant, callId) });
}

/** Removes the call and its recording, e.g. when the business no longer needs it. */
export async function deleteCallHandler(tenant: string, callId: string, viewer: Viewer): Promise<Response> {
  if (!viewer.permissions.includes("calls.delete")) return forbidden("delete calls");
  if (!(await getCall(tenant, callId, callScope(viewer)))) return fail("Not found", 404);
  const row = await deleteCallRow(tenant, callId);
  if (!row) return fail("Not found", 404);
  await deleteRecording(row.recordingPath);
  return new Response(null, { status: 204 });
}
