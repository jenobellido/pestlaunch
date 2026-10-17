import "server-only";
import { createRecordingUrl } from "@/core/storage";
import { findCallRow } from "./call-repository";

/** A short-lived URL to play a call's recording, or null when it can't be opened. */
export async function getCallRecordingUrl(tenant: string, callId: string): Promise<string | null> {
  const row = await findCallRow(tenant, callId);
  // Demo calls (npm run seed:demo) have no audio; their path ends in ".none".
  if (!row || row.recordingPath.endsWith(".none")) return null;
  try {
    return await createRecordingUrl(row.recordingPath);
  } catch (error) {
    console.error("[calls] recording URL failed", error instanceof Error ? error.message : error);
    return null;
  }
}
