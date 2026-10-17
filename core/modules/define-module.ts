import type { ModuleManifest } from "./types";

/** Identity helper that keeps the module id as a literal type. */
export function defineModule<const Id extends string>(
  manifest: ModuleManifest<Id>,
): ModuleManifest<Id> {
  return manifest;
}
