import "server-only";
import { and, count, eq, like } from "drizzle-orm";
import { db } from "@/core/db";
import type { TranscriptSegment } from "@/core/calls";
import EXAMPLES from "../demo/example-calls.json";
import type { CallOutcome } from "../model/types";
import { calls } from "./schema";

// Example calls a new company can load to see the app working before uploading its own. They
// are the invented calls from scripts/demo-calls.ts with their results already worked out, so
// loading them costs nothing and needs no AI. They have no audio: the recording path is a
// marker, never a file, which is also how they're told apart from real calls.

interface ExampleCall {
  fileName: string;
  daysAgo: number;
  callType: string;
  durationSec: number;
  employeeName: string | null;
  transcript: TranscriptSegment[];
  outcome: CallOutcome;
  analyses: Record<string, unknown>;
}

const EXAMPLE_CALLS = EXAMPLES as unknown as ExampleCall[];
const DAY_MS = 24 * 60 * 60 * 1000;
const examplePath = (tenantId: string) => `${tenantId}/example-${crypto.randomUUID()}.none`;
const isExample = (tenantId: string) => like(calls.recordingPath, `${tenantId}/example-%.none`);

export async function countExampleCalls(tenantId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(calls).where(and(eq(calls.tenantId, tenantId), isExample(tenantId)));
  return row?.n ?? 0;
}

/** Adds the example calls, dated over the last couple of weeks. Does nothing if they're already there. */
export async function loadExampleCalls(tenantId: string): Promise<number> {
  if ((await countExampleCalls(tenantId)) > 0) return 0;
  const now = Date.now();
  await db.insert(calls).values(
    EXAMPLE_CALLS.map((c) => ({
      tenantId,
      fileName: c.fileName,
      recordingPath: examplePath(tenantId),
      status: "ready" as const,
      callType: c.callType,
      durationSec: c.durationSec,
      employeeName: c.employeeName,
      transcript: c.transcript,
      outcome: c.outcome,
      analyses: c.analyses,
      createdAt: new Date(now - c.daysAgo * DAY_MS),
    })),
  );
  return EXAMPLE_CALLS.length;
}

/** Removes the example calls (and anything hanging off them, like follow-ups). Real calls are untouched. */
export async function removeExampleCalls(tenantId: string): Promise<void> {
  await db.delete(calls).where(and(eq(calls.tenantId, tenantId), isExample(tenantId)));
}
