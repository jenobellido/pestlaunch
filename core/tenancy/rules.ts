import type { Permission } from "./permissions";
import type { Role } from "./types";

// Access rules as pure functions, so they can be unit tested without a database.

/** Whether the member has a permission. */
export function can(access: { readonly permissions: readonly Permission[] }, permission: Permission) {
  return access.permissions.includes(permission);
}

/**
 * Nobody can hand out more than they have: a role may only be granted by someone holding all
 * of its permissions, and only an owner can grant the owner role. This stops a manager with
 * "team.manage" from promoting themselves or anyone else above their own level.
 */
export function canGrantRole(granter: Role, role: Role) {
  if (role.isOwner) return granter.isOwner;
  return role.permissions.every((p) => granter.permissions.includes(p));
}
