import { notFound } from "next/navigation";
import { requireTenantAccess, type TenantAccess } from "@/core/tenancy";
import { isModuleEnabled, type ModuleId } from "@/modules/registry";

/**
 * Call at the top of every page that belongs to a module. Checks the user is
 * signed in, is a member of the tenant, and has the module enabled.
 *
 * Next renders layouts and pages in parallel, so a check in a layout alone
 * would not stop a page from rendering and sending its data.
 */
export async function requireModule(
  params: Promise<{ tenant: string }>,
  moduleId: ModuleId,
): Promise<TenantAccess> {
  const { tenant } = await params;
  const access = await requireTenantAccess(tenant);
  if (!(await isModuleEnabled(tenant, moduleId))) notFound();
  return access;
}
