import type { ModuleRouteHandler } from "@/core/modules";
import { checkTenantAccess } from "@/core/tenancy";
import { isModuleEnabled, type ModuleId } from "@/modules/registry";

/**
 * Wraps a module's route handler so it only runs for a signed-in member of the
 * tenant in the URL, with the module enabled. Responds 401 or 404 otherwise.
 */
export function withModule(moduleId: ModuleId, handler: ModuleRouteHandler) {
  return async (req: Request, ctx: { params: Promise<{ tenant: string }> }) => {
    const { tenant } = await ctx.params;
    const result = await checkTenantAccess(tenant);
    if (!result.ok) {
      return result.reason === "unauthenticated"
        ? Response.json({ error: "Unauthorized" }, { status: 401 })
        : Response.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await isModuleEnabled(tenant, moduleId))) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return handler(req, { tenant, userId: result.access.user.id, permissions: result.access.permissions });
  };
}
