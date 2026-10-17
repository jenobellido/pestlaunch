import { resolveEnabledModules } from "@/core/modules";
import { getTenantBySlug } from "@/core/tenancy";
import { callsModule } from "./calls";
import { scorecardsModule } from "./scorecards";
import { coachingModule } from "./coaching";

// Every module must be registered here. Together with registry.server.ts this
// is the only place in modules/ allowed to import from more than one module.
export const moduleRegistry = [callsModule, scorecardsModule, coachingModule] as const;

export type AppModule = (typeof moduleRegistry)[number];
export type ModuleId = AppModule["id"];

export async function getEnabledModules(tenantSlug: string): Promise<AppModule[]> {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return [];
  return resolveEnabledModules(moduleRegistry, tenant.modules);
}

export async function getEnabledModuleIds(tenantSlug: string): Promise<Set<ModuleId>> {
  return new Set((await getEnabledModules(tenantSlug)).map((m) => m.id));
}

export async function isModuleEnabled(tenantSlug: string, id: ModuleId): Promise<boolean> {
  return (await getEnabledModuleIds(tenantSlug)).has(id);
}
