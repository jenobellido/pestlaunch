import type { Permission } from "@/core/tenancy/permissions";

/**
 * A module is a self-contained business feature (customers, scheduling, …)
 * that can be switched on or off per tenant.
 */
export interface ModuleNavItem {
  label: string;
  /** Path relative to the tenant root, e.g. "/customers". */
  href: string;
  /** Shown in the sidebar and the mobile nav. */
  icon?: React.ComponentType<{ className?: string }>;
  /** False for pages reached from elsewhere (e.g. reference pages), not the sidebar. */
  inSidebar?: boolean;
}

export interface ModuleManifest<Id extends string = string> {
  id: Id;
  name: string;
  description?: string;
  /** Used when a tenant has no explicit setting for this module. */
  defaultEnabled: boolean;
  /** Modules that must also be enabled for this one to work. */
  dependsOn?: readonly string[];
  nav?: readonly ModuleNavItem[];
}

/** Per-tenant overrides keyed by module id. Missing keys fall back to `defaultEnabled`. */
export type ModuleSettings = Readonly<Record<string, boolean | undefined>>;

/** A route handler that runs only after the module has been checked for the tenant. */
export type ModuleRouteHandler = (
  req: Request,
  ctx: { tenant: string; userId: string; permissions: readonly Permission[] },
) => Promise<Response>;
