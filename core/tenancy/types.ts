import type { ModuleSettings } from "@/core/modules";

export type MemberRole = "owner" | "manager" | "rep";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  modules: ModuleSettings;
}
