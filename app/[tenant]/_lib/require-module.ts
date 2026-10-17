import { notFound } from "next/navigation";
import { isModuleEnabled, type ModuleId } from "@/modules/registry";

/**
 * Call at the top of every page, route handler and server action that belongs
 * to a module. Next renders layouts and pages in parallel, so a check in a
 * layout alone would not stop a disabled module's page from rendering.
 *
 * Returns the tenant slug, or 404s when the module is off for that tenant.
 */
export async function requireModule(
  params: Promise<{ tenant: string }>,
  moduleId: ModuleId,
): Promise<string> {
  const { tenant } = await params;
  if (!(await isModuleEnabled(tenant, moduleId))) notFound();
  return tenant;
}
