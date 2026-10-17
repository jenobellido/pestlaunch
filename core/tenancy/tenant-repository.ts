import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { db, schema } from "@/core/db";
import { slugify } from "./slug";
import type { MemberRole, Tenant } from "./types";

const { tenants, tenantMembers, tenantModules } = schema;

export function tenantCacheTag(slug: string) {
  return `tenant:${slug}`;
}

/** Tenant with its module overrides. Cached; revalidate with `tenantCacheTag(slug)`. */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  "use cache";
  cacheTag(tenantCacheTag(slug));

  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (!tenant) return null;

  const overrides = await db
    .select({ moduleId: tenantModules.moduleId, enabled: tenantModules.enabled })
    .from(tenantModules)
    .where(eq(tenantModules.tenantId, tenant.id));

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    modules: Object.fromEntries(overrides.map((o) => [o.moduleId, o.enabled])),
  };
}

export async function getMemberRole(tenantId: string, userId: string): Promise<MemberRole | null> {
  const [row] = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

/** Tenants the user belongs to, oldest membership first. */
export async function listUserTenants(userId: string) {
  return db
    .select({ slug: tenants.slug, name: tenants.name, role: tenantMembers.role })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .where(eq(tenantMembers.userId, userId))
    .orderBy(asc(tenantMembers.createdAt));
}

/** Creates a tenant with a unique slug and makes the user its owner. */
export async function createTenantForOwner(name: string, userId: string) {
  const base = slugify(name);
  return db.transaction(async (tx) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 4)}`;
      const [tenant] = await tx
        .insert(tenants)
        .values({ slug, name })
        .onConflictDoNothing({ target: tenants.slug })
        .returning();
      if (!tenant) continue;
      await tx.insert(tenantMembers).values({ tenantId: tenant.id, userId, role: "owner" });
      return tenant;
    }
    throw new Error("Could not generate a unique company URL.");
  });
}

/** Renames a tenant. The slug (its URL) stays the same. Revalidate `tenantCacheTag(slug)` after. */
export async function renameTenant(tenantId: string, name: string) {
  await db.update(tenants).set({ name }).where(eq(tenants.id, tenantId));
}

/** Saves module overrides for a tenant. Revalidate `tenantCacheTag(slug)` after. */
export async function setTenantModules(tenantId: string, settings: Record<string, boolean>) {
  const rows = Object.entries(settings).map(([moduleId, enabled]) => ({ tenantId, moduleId, enabled }));
  if (rows.length === 0) return;
  await db
    .insert(tenantModules)
    .values(rows)
    .onConflictDoUpdate({
      target: [tenantModules.tenantId, tenantModules.moduleId],
      set: { enabled: sql`excluded.enabled`, updatedAt: sql`now()` },
    });
}
