import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

// RLS is enabled on every table with no policies, so Supabase's public Data
// API can't read them. All access goes through the server's DB connection,
// and authorization is enforced in the app (core/tenancy/access.ts).

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const tenants = pgTable("tenants", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  /** How a call's type is decided: "auto" (the AI) or "ask" (whoever uploads picks it). */
  callTypeMode: text().notNull().default("auto"),
  createdAt: createdAt(),
}).enableRLS();

/**
 * A tenant's roles: named sets of permissions (see core/tenancy/permissions.ts). Every tenant
 * gets Owner, Manager and Rep; custom roles are just more rows. `isOwner` marks the role that
 * always has every permission and can't be edited or deleted, so a tenant can't lock itself out.
 */
export const tenantRoles = pgTable(
  "tenant_roles",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text().notNull(),
    permissions: text().array().notNull().default([]),
    isOwner: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.tenantId, t.name), index().on(t.tenantId)],
).enableRLS();

export const tenantMembers = pgTable(
  "tenant_members",
  {
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    roleId: uuid()
      .notNull()
      .references(() => tenantRoles.id, { onDelete: "restrict" }),
    /** Shown on calls and coaching; copied from the user's profile name and kept in sync. */
    displayName: text(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.userId] }), index().on(t.userId)],
).enableRLS();

/**
 * A pending invitation. The link carries `token`; whoever opens it signed in (or after signing
 * up) joins the tenant with `roleId`. No email server needed: the inviter shares the link.
 */
export const tenantInvites = pgTable(
  "tenant_invites",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text().notNull(),
    roleId: uuid()
      .notNull()
      .references(() => tenantRoles.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    invitedBy: uuid().references(() => authUsers.id, { onDelete: "set null" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.tenantId)],
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

/**
 * A company's call types (core/calls/catalog.ts). Built-in types only get a row once the
 * company edits them (deleting the row resets to the default); the company's own types
 * ("custom-…") always have one. `scorecard` is the full scorecard, or null for unscored types.
 */
export const tenantCallTypes = pgTable(
  "tenant_call_types",
  {
    tenantId: uuid()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    key: text().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    group: text().notNull(),
    scorecard: jsonb(),
    enabled: boolean().notNull().default(true),
    position: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.key] })],
).enableRLS();
