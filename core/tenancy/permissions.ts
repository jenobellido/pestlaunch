/**
 * Everything a member can be allowed to do. Roles are per-tenant lists of these, so a
 * tenant can add custom roles without code changes. Check permissions, never role names.
 */
export const PERMISSIONS = {
  "calls.upload": "Upload call recordings",
  "calls.view_all": "See every call and the whole team's coaching (otherwise only their own)",
  "calls.assign": "Choose or change which team member a call belongs to",
  "calls.delete": "Delete calls and their recordings",
  "calls.review": "Correct the AI's results (call type, outcome, scorecard steps) and mark calls reviewed",
  "coaching.manage": "Assign coaching plays to team members",
  "team.manage": "Invite people, change members' roles and remove members",
  "roles.manage": "Create and edit roles and their permissions",
  "company.manage": "Rename the company",
  "modules.manage": "Turn modules on or off for the company",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function isPermission(value: string): value is Permission {
  return value in PERMISSIONS;
}

/** Roles every tenant starts with. The owner role always has every permission and can't be edited. */
export const DEFAULT_ROLES: { key: "owner" | "manager" | "rep"; name: string; permissions: Permission[] }[] = [
  { key: "owner", name: "Owner", permissions: ALL_PERMISSIONS },
  {
    key: "manager",
    name: "Manager",
    permissions: [
      "calls.upload",
      "calls.view_all",
      "calls.assign",
      "calls.delete",
      "calls.review",
      "coaching.manage",
      "team.manage",
    ],
  },
  { key: "rep", name: "Rep", permissions: ["calls.upload"] },
];
