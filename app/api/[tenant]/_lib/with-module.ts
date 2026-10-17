import type { ModuleRouteHandler } from "@/core/modules";
import { isModuleEnabled, type ModuleId } from "@/modules/registry";

/**
 * Wraps a module's route handler so it only runs when the module is enabled
 * for the tenant in the URL. Responds 404 otherwise.
 */
export function withModule(moduleId: ModuleId, handler: ModuleRouteHandler) {
  return async (req: Request, ctx: { params: Promise<{ tenant: string }> }) => {
    const { tenant } = await ctx.params;
    if (!(await isModuleEnabled(tenant, moduleId))) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return handler(req, { tenant });
  };
}
