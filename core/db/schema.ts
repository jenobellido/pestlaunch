import { boolean, index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

// RLS is enabled on every table with no policies, so Supabase's public Data
// API can't read them. All access goes through the server's DB connection,
// and authorization is enforced in the app (core/tenancy/access.ts).

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const memberRole = pgEnum("member_role", ["owner", "manager", "rep"]);

export const tenants = pgTable("tenants", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  createdAt: createdAt(),
}).enableRLS();

export const tenantMembers = pgTable(
  "tenant_members",
  {
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: memberRole().notNull().default("rep"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.userId] }), index().on(t.userId)],
).enableRLS();

/** Per-tenant module overrides. A missing row means the module's default applies. */
export const tenantModules = pgTable(
  "tenant_modules",
  {
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    moduleId: text().notNull(),
    enabled: boolean().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.moduleId] })],
).enableRLS();
