import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/core/config/env";
import { RECORDINGS_BUCKET } from "./config";

// The "recordings" bucket is private with no storage policies: only this
// server-side client (secret key) can read or write it. The browser gets a
// one-time signed upload URL and never reads recordings directly.

function storage() {
  return createClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(RECORDINGS_BUCKET);
}

/** True when `path` sits in the tenant's own folder, so a client can't point at another tenant's file. */
export function isTenantRecordingPath(tenantId: string, path: string) {
  return path.startsWith(`${tenantId}/`) && !path.includes("..");
}

/**
 * Reserves a path in the tenant's folder (`extension` includes the dot, e.g. ".mp3") and returns a signed URL the browser
 * uploads to directly, so large files never pass through our server.
 */
export async function createRecordingUpload(tenantId: string, extension: string) {
  const path = `${tenantId}/${crypto.randomUUID()}${extension}`;
  const { data, error } = await storage().createSignedUploadUrl(path);
  if (error) throw new Error(`Could not prepare the upload: ${error.message}`);
  return { path, token: data.token };
}

/** Size of an uploaded recording, or null when nothing was uploaded at `path`. */
export async function getRecordingSize(path: string): Promise<number | null> {
  const { data, error } = await storage().info(path);
  return error ? null : (data.size ?? null);
}

export async function downloadRecording(path: string): Promise<Blob> {
  const { data, error } = await storage().download(path);
  if (error) throw new Error(`Could not read the recording: ${error.message}`);
  return data;
}

/** A short-lived URL for playing a recording in the browser. */
export async function createRecordingUrl(path: string, expiresInSec = 60 * 60) {
  const { data, error } = await storage().createSignedUrl(path, expiresInSec);
  if (error) throw new Error(`Could not open the recording: ${error.message}`);
  return data.signedUrl;
}

export async function deleteRecording(path: string) {
  const { error } = await storage().remove([path]);
  if (error) throw new Error(`Could not delete the recording: ${error.message}`);
}
