"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { getCurrentUser, updateDisplayName } from "@/core/auth";
import { checkTenantAccess, renameTenant, setTenantModules, tenantCacheTag } from "@/core/tenancy";
import { baseModuleId, getEnabledModuleIds, moduleRegistry, type ModuleId } from "@/modules/registry";

/** State of a one-field settings form. `value` echoes the input back after an error. */
export type FieldFormState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldError?: string; value: string }
  | { status: "saved"; at: number };

const displayName = z.string().trim().min(1, "Enter your name.").max(80, "Keep your name under 80 characters.");
const companyName = z
  .string()
  .trim()
  .min(2, "Enter your company name.")
  .max(80, "Keep the name under 80 characters.");

const SESSION_ENDED = "Your session ended. Log in again to save changes.";

export async function updateProfile(_prev: FieldFormState, formData: FormData): Promise<FieldFormState> {
  const value = String(formData.get("fullName") ?? "");
  const parsed = displayName.safeParse(value);
  if (!parsed.success) return { status: "error", fieldError: parsed.error.issues[0].message, value };

  if (!(await getCurrentUser())) return { status: "error", message: SESSION_ENDED, value };

  const { ok } = await updateDisplayName(parsed.data);
  if (!ok) return { status: "error", message: "We couldn't save your name. Try again.", value };

  // The name shows in the sidebar, so re-render the page with the refreshed session.
  refresh();
  return { status: "saved", at: Date.now() };
}

export async function updateCompanyName(
  slug: string,
  _prev: FieldFormState,
  formData: FormData,
): Promise<FieldFormState> {
  const value = String(formData.get("companyName") ?? "");
  const parsed = companyName.safeParse(value);
  if (!parsed.success) return { status: "error", fieldError: parsed.error.issues[0].message, value };

  const access = await checkTenantAccess(slug);
  if (!access.ok) return { status: "error", message: SESSION_ENDED, value };
  if (access.access.role !== "owner") {
    return { status: "error", message: "Only owners can change the company name.", value };
  }

  await renameTenant(access.access.tenant.id, parsed.data);
  updateTag(tenantCacheTag(slug));
  return { status: "saved", at: Date.now() };
}

const moduleIds = moduleRegistry.map((m) => m.id) as [ModuleId, ...ModuleId[]];
const moduleToggle = z.object({ moduleId: z.enum(moduleIds), enabled: z.boolean() });

export type ModuleToggleResult = { ok: true } | { ok: false; error: string };

/** Turns a module on or off for the tenant. Owners only. */
export async function setModuleEnabled(
  slug: string,
  moduleId: string,
  enabled: boolean,
): Promise<ModuleToggleResult> {
  const parsed = moduleToggle.safeParse({ moduleId, enabled });
  if (!parsed.success) return { ok: false, error: "That module doesn't exist." };

  const access = await checkTenantAccess(slug);
  if (!access.ok) return { ok: false, error: SESSION_ENDED };
  if (access.access.role !== "owner") return { ok: false, error: "Only owners can change modules." };

  const manifest = moduleRegistry.find((m) => m.id === parsed.data.moduleId)!;
  if (manifest.id === baseModuleId && !enabled) {
    return { ok: false, error: `${manifest.name} is the base module and can't be turned off.` };
  }
  if (enabled) {
    const active = await getEnabledModuleIds(slug);
    const missing = (manifest.dependsOn ?? []).filter((dep) => !active.has(dep as ModuleId));
    if (missing.length > 0) {
      const names = missing.map((id) => moduleRegistry.find((m) => m.id === id)?.name ?? id);
      return { ok: false, error: `Turn on ${names.join(" and ")} first.` };
    }
  }

  await setTenantModules(access.access.tenant.id, { [manifest.id]: enabled });
  updateTag(tenantCacheTag(slug));
  return { ok: true };
}
