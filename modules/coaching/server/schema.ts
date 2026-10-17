import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { tenants } from "@/core/db/schema";

// Owned by the coaching module; drizzle.config.ts picks up every modules/*/server/schema.ts.

export const playStatus = pgEnum("play_status", ["open", "done"]);

/**
 * A coaching "play": one concrete thing a team member should work on, assigned by a manager
 * (usually from a suggestion based on the scorecard step they miss most).
 */
export const coachingPlays = pgTable(
  "coaching_plays",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    assigneeId: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    assignedBy: uuid().references(() => authUsers.id, { onDelete: "set null" }),
    title: text().notNull(),
    detail: text(),
    status: playStatus().notNull().default("open"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.tenantId, t.assigneeId)],
).enableRLS();
