import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CallType, TranscriptSegment } from "@/core/calls";
import { authUsers } from "drizzle-orm/supabase";
import { tenants } from "@/core/db/schema";
import type { CallOutcome, CallReview, ProcessingStage } from "../model/types";

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
    /** Pipeline step while processing; null otherwise. */
    stage: text().$type<ProcessingStage>(),
    error: text(),
    /** The team member the call belongs to: set on upload, matched from the call, or assigned later. */
    employeeId: uuid().references(() => authUsers.id, { onDelete: "set null" }),
    /** The employee's name as heard in the call. A hint only; `employeeId` is the source of truth. */
    employeeName: text(),
    durationSec: integer(),
    callType: text().$type<CallType>(),
    /** The type was chosen by a person (on upload or in review), so the AI never changes it. */
    typeLocked: boolean().notNull().default(false),
    transcript: jsonb().$type<TranscriptSegment[]>(),
    outcome: jsonb().$type<CallOutcome>(),
    /** Results from module analysis steps, keyed by module id. */
    analyses: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    /** Set when a person has checked (and maybe corrected) the AI's results. */
    review: jsonb().$type<CallReview>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.tenantId, t.createdAt.desc())],
).enableRLS();

export const taskStatus = pgEnum("call_task_status", ["open", "done"]);

/**
 * A follow-up someone owes on a call (call a prospect back, send the agreement, try to win back
 * a cancellation). Created from a Leak or a call's follow-ups and assigned to a team member.
 */
export const callTasks = pgTable(
  "call_tasks",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    callId: uuid()
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    assigneeId: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    assignedBy: uuid().references(() => authUsers.id, { onDelete: "set null" }),
    title: text().notNull(),
    status: taskStatus().notNull().default("open"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.tenantId, t.assigneeId), index().on(t.callId)],
).enableRLS();

