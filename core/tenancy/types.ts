import type { ModuleSettings } from "@/core/modules";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  modules: ModuleSettings;
}
