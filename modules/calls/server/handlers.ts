import "server-only";
import { after } from "next/server";
import { z } from "zod";
import type { CallAnalysisStep } from "@/core/calls";
import type { ModuleRouteHandler } from "@/core/modules";
import {
  createRecordingUpload,
  deleteRecording,
  getRecordingSize,
  isTenantRecordingPath,
  MAX_RECORDING_BYTES,
  RECORDING_EXTENSIONS,
} from "@/core/storage";
import { getTenantBySlug } from "@/core/tenancy";
import { claimCallForRetry, deleteCallRow, getCall, insertCall, listCalls } from "./call-repository";
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
});

async function tenantId(slug: string) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) throw new Error(`Unknown tenant ${slug}`);
  return tenant.id;
}

export const listCallsHandler: ModuleRouteHandler = async (_req, { tenant }) => {
  return Response.json({ data: await listCalls(tenant) });
};

export async function getCallHandler(tenant: string, callId: string): Promise<Response> {
  const call = await getCall(tenant, callId);
  if (!call) return fail("Not found", 404);
  return Response.json({ data: call });
}

export const createUploadHandler: ModuleRouteHandler = async (req, { tenant }) => {
  const body = uploadRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Send the file's name and size.", 400);

  const extension = extensionOf(body.data.fileName);
  if (!(RECORDING_EXTENSIONS as readonly string[]).includes(extension)) {
    return fail("Upload an audio file, such as MP3, WAV or M4A.", 400);
  }
  if (body.data.size > MAX_RECORDING_BYTES) {
    return fail(`Recordings can be up to ${MAX_RECORDING_BYTES / 1024 / 1024} MB.`, 413);
  }

  const upload = await createRecordingUpload(await tenantId(tenant), extension);
  return Response.json({ data: upload }, { status: 201 });
};

export async function createCallHandler(
  req: Request,
  tenant: string,
  steps: readonly CallAnalysisStep[],
): Promise<Response> {
  const body = createRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Send the uploaded recording's path and file name.", 400);

  const id = await tenantId(tenant);
  const { path, fileName } = body.data;
  if (!isTenantRecordingPath(id, path)) return fail("Not found", 404);
  if ((await getRecordingSize(path)) === null) return fail("Upload the recording before processing it.", 409);

  const row = await insertCall({ tenantId: id, fileName, recordingPath: path });
  // Processing takes from seconds to minutes, so it runs after the response. The UI shows
  // the call as processing and refreshes until it's ready.
  after(() => processCall({ id: row.id, tenant, fileName, recordingPath: path }, steps));

  return Response.json({ data: await getCall(tenant, row.id) }, { status: 202 });
}

/** Runs a failed or stalled call again, reusing its transcript when it has one. */
export async function retryCallHandler(
  tenant: string,
  callId: string,
  steps: readonly CallAnalysisStep[],
): Promise<Response> {
  const row = await claimCallForRetry(tenant, callId);
  if (!row) {
    const call = await getCall(tenant, callId);
    return call ? fail("This call is already processing or finished.", 409) : fail("Not found", 404);
  }
  const transcript = row.transcript ?? undefined;
  after(() =>
    processCall({ id: row.id, tenant, fileName: row.fileName, recordingPath: row.recordingPath }, steps, { transcript }),
  );
  return Response.json({ data: await getCall(tenant, row.id) }, { status: 202 });
}

/** Removes the call and its recording, e.g. when the business no longer needs it. */
export async function deleteCallHandler(tenant: string, callId: string): Promise<Response> {
  const row = await deleteCallRow(tenant, callId);
  if (!row) return fail("Not found", 404);
  await deleteRecording(row.recordingPath);
  return new Response(null, { status: 204 });
}
