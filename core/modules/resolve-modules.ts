import type { ModuleManifest, ModuleSettings } from "./types";

/**
 * Returns the manifests that are enabled for a tenant, after applying the
 * tenant's overrides and dropping any module whose dependencies are disabled.
 */
export function resolveEnabledModules<M extends ModuleManifest>(
  manifests: readonly M[],
  settings: ModuleSettings,
): M[] {
  const enabled = new Set(
    manifests
      .filter((m) => settings[m.id] ?? m.defaultEnabled)
      .map((m) => m.id),
  );

  // Disabling one module can break a chain of dependents, so repeat until stable.
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of manifests) {
      if (enabled.has(m.id) && m.dependsOn?.some((dep) => !enabled.has(dep))) {
        enabled.delete(m.id);
        changed = true;
      }
    }
  }

  return manifests.filter((m) => enabled.has(m.id));
}
