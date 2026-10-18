// Fills a company with invented demo calls and runs them through the real analysis, scoring
// and coaching (transcription is skipped: the transcripts are written by hand).
//
//   npm run seed:demo -- <company-slug>
//
// Needs .env.local with the database and AI settings. No recordings are created, so demo
// calls have no audio player. Delete them like any other call.
import { eq } from "drizzle-orm";
import { resolveEnabledModules } from "@/core/modules";
import { db, schema } from "@/core/db";
import type { TranscriptSegment } from "@/core/calls";
import { calls } from "@/modules/calls/server/schema";
import { insertCall } from "@/modules/calls/server/call-repository";
import { processCall } from "@/modules/calls/server/process-call";
import { coachingStep } from "@/modules/coaching/server";
import { moduleRegistry } from "@/modules/registry";
import { scoringStep } from "@/modules/scorecards/server";
import { sentimentStep } from "@/modules/sentiment/server";
import { DEMO_CALLS } from "./demo-calls";

const WORDS_PER_SECOND = 2.6;

function toSegments(lines: (typeof DEMO_CALLS)[number]["lines"]): TranscriptSegment[] {
  let at = 0;
  return lines.map(([speaker, text]) => {
    const length = Math.max(1.5, text.split(/\s+/).length / WORDS_PER_SECOND);
    const segment = { speaker, start: at, end: at + length, text };
    at += length + 0.6;
    return segment;
  });
}

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Usage: npm run seed:demo -- <company-slug>");
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.slug, slug));
  if (!tenant) throw new Error(`No company with the URL /${slug}.`);
  // The app's registry reads tenants through Next's cache, which doesn't exist in a script,
  // so work out the enabled analysis steps from the tenant's module settings directly.
  const overrides = await db.select().from(schema.tenantModules).where(eq(schema.tenantModules.tenantId, tenant.id));
  const enabled = new Set(
    resolveEnabledModules(moduleRegistry, Object.fromEntries(overrides.map((o) => [o.moduleId, o.enabled]))).map((m) => m.id),
  );
  const steps = [
    enabled.has("scorecards") && scoringStep,
    enabled.has("coaching") && coachingStep,
    enabled.has("sentiment") && sentimentStep,
  ].filter((s) => !!s);

  for (const demo of DEMO_CALLS) {
    const transcript = toSegments(demo.lines);
    const row = await insertCall({
      tenantId: tenant.id,
      fileName: demo.fileName,
      // No file exists: the transcript is given, so processing never downloads it.
      recordingPath: `${tenant.id}/demo-${crypto.randomUUID()}.none`,
      employeeId: null,
    });
    const createdAt = new Date(Date.now() - demo.daysAgo * 24 * 60 * 60 * 1000);
    await db
      .update(calls)
      .set({ createdAt, transcript, durationSec: Math.round(transcript.at(-1)!.end) })
      .where(eq(calls.id, row.id));

    await processCall(
      { id: row.id, tenant: slug, tenantId: tenant.id, fileName: demo.fileName, recordingPath: row.recordingPath, employeeId: null },
      steps,
      { transcript },
    );
    const [saved] = await db.select({ status: calls.status, error: calls.error }).from(calls).where(eq(calls.id, row.id));
    console.log(`${saved.status === "ready" ? "✓" : "✗"} ${demo.fileName}${saved.error ? ` (${saved.error})` : ""}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
