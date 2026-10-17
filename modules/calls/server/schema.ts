import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CallType, TranscriptSegment } from "@/core/calls";
import { tenants } from "@/core/db/schema";
import type { CallOutcome } from "../model/types";

// Owned by the calls module; drizzle.config.ts picks up every modules/*/server/schema.ts.
// RLS is on with no policies, like every table (see core/db/schema.ts).

export const callStatus = pgEnum("call_status", ["processing", "ready", "failed"]);

export const calls = pgTable(
  "calls",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    fileName: text().notNull(),
    /** Object path in the private "recordings" bucket. */
    recordingPath: text().notNull(),
    status: callStatus().notNull().default("processing"),
    error: text(),
    employeeName: text(),
    durationSec: integer(),
    callType: text().$type<CallType>(),
    transcript: jsonb().$type<TranscriptSegment[]>(),
    outcome: jsonb().$type<CallOutcome>(),
    /** Results from module analysis steps, keyed by module id. */
    analyses: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.tenantId, t.createdAt.desc())],
).enableRLS();
