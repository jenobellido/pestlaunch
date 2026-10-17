import { cacheTag } from "next/cache";
import type { Tenant } from "./types";

// Placeholder data source. Replace with a database lookup; keep the cache tag
// so that toggling a module can call `revalidateTag(tenantCacheTag(slug))`.
const tenants: Record<string, Tenant> = {
  "noble-pest": {
    id: "t_noble",
    slug: "noble-pest",
    name: "Noble Pest Services",
    modules: {},
  },
  "abc-pest": {
    id: "t_abc",
    slug: "abc-pest",
    name: "ABC Pest Control",
    modules: { coaching: false },
  },
};
export function tenantCacheTag(slug: string) {
  return `tenant:${slug}`;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  "use cache";
  cacheTag(tenantCacheTag(slug));
  return tenants[slug] ?? null;
}

export async function listTenants(): Promise<Tenant[]> {
  "use cache";
  return Object.values(tenants);
}
