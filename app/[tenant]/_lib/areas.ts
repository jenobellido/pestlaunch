import type { Permission } from "@/core/tenancy/permissions";

// Which parts of the workspace someone can open, from their permissions. One place, so the
// sidebar, the settings menu, quick search and the pages themselves all agree (pages still check
// on the server; hiding a link is never the protection). Pure, so it's unit tested.

type Perms = readonly Permission[];
const has = (perms: Perms, p: Permission) => perms.includes(p);

export interface Areas {
  /** The whole team's calls, coaching and rep pages. Without it you see only your own. */
  team: boolean;
  settings: {
    /** Everyone: their own profile and theme. */
    profile: true;
    appearance: true;
    /** The member list (names, emails, roles). */
    members: boolean;
    /** Roles and what each can do. */
    roles: boolean;
    /** Company name, modules and example data. */
    company: boolean;
    /** Call types and their scorecards. */
    callTypes: boolean;
  };
  /** Loading or removing example data changes users and calls company-wide. */
  exampleData: boolean;
}

export function areasFor(perms: Perms): Areas {
  return {
    team: has(perms, "calls.view_all"),
    settings: {
      profile: true,
      appearance: true,
      members: has(perms, "team.manage") || has(perms, "calls.view_all"),
      roles: has(perms, "roles.manage") || has(perms, "team.manage"),
      company: has(perms, "company.manage") || has(perms, "modules.manage"),
      callTypes: has(perms, "calltypes.manage"),
    },
    exampleData: has(perms, "company.manage"),
  };
}
