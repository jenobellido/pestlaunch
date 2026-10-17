import type { ModuleSettings } from "@/core/modules";

import type { Permission } from "./permissions";

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  /** The owner role has every permission and can't be edited or deleted. */
  isOwner: boolean;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  modules: ModuleSettings;
}
