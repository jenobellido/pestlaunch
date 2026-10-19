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

/** The example calls' rep names (they're the same in every company). */
export const EXAMPLE_REP_NAMES = [...new Set(EXAMPLE_CALLS.map((c) => c.employeeName).filter((n): n is string => !!n))];

/**
 * Adds the example calls, dated over the last couple of weeks, each assigned to its rep when
 * `employees` maps the rep's name to a team member. Returns the new calls by file name; empty
 * if they were already there.
 */
export async function loadExampleCalls(
  tenantId: string,
  employees: Record<string, string> = {},
): Promise<{ id: string; fileName: string }[]> {
  if ((await countExampleCalls(tenantId)) > 0) return [];
  const now = Date.now();
  return db.insert(calls).values(
    EXAMPLE_CALLS.map((c) => ({
      tenantId,
      fileName: c.fileName,
      recordingPath: examplePath(tenantId),
      status: "ready" as const,
      callType: c.callType,
      durationSec: c.durationSec,
      employeeName: c.employeeName,
      employeeId: (c.employeeName && employees[c.employeeName]) || null,
      transcript: c.transcript,
      outcome: c.outcome,
      analyses: c.analyses,
      createdAt: new Date(now - c.daysAgo * DAY_MS),
    })),
  ).returning({ id: calls.id, fileName: calls.fileName });
}

/** Removes the example calls (and anything hanging off them, like follow-ups). Real calls are untouched. */
export async function removeExampleCalls(tenantId: string): Promise<void> {
  await db.delete(calls).where(and(eq(calls.tenantId, tenantId), isExample(tenantId)));
}
