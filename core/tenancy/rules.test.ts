import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, DEFAULT_ROLES, isPermission, type Permission } from "./permissions";
import { can, canGrantRole, seesAllCalls, withRequiredPermissions } from "./rules";
import type { Role } from "./types";

const role = (name: string, permissions: Permission[], isOwner = false): Role => ({
  id: name.toLowerCase(),
  name,
  permissions,
  isOwner,
});

const defaults = Object.fromEntries(DEFAULT_ROLES.map((r) => [r.key, role(r.name, r.permissions, r.key === "owner")]));
const { owner, manager, rep } = defaults;

describe("can", () => {
  it("is true only for permissions the member holds", () => {
    const access = { permissions: ["calls.upload", "calls.view_all"] as Permission[] };
    expect(can(access, "calls.upload")).toBe(true);
    expect(can(access, "calls.delete")).toBe(false);
  });

  it("is false for everything with no permissions", () => {
    for (const p of ALL_PERMISSIONS) expect(can({ permissions: [] }, p)).toBe(false);
  });
});

describe("default roles", () => {
  it("gives the owner every permission", () => {
    expect([...owner.permissions].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it("lets reps upload but not see the whole team, delete or manage anything", () => {
    expect(rep.permissions).toEqual(["calls.upload"]);
  });

  it("doesn't let managers manage roles, the company or modules", () => {
    for (const p of ["roles.manage", "company.manage", "modules.manage"] as const) {
      expect(manager.permissions).not.toContain(p);
    }
  });

  it("only uses known permissions", () => {
    for (const r of DEFAULT_ROLES) for (const p of r.permissions) expect(isPermission(p)).toBe(true);
  });
});

describe("isPermission", () => {
  it("accepts catalogue keys and rejects anything else", () => {
    expect(isPermission("calls.upload")).toBe(true);
    expect(isPermission("calls.everything")).toBe(false);
    expect(isPermission("")).toBe(false);
  });
});

describe("canGrantRole", () => {
  it("lets only an owner grant the owner role", () => {
    expect(canGrantRole(owner, owner)).toBe(true);
    expect(canGrantRole(manager, owner)).toBe(false);
    // Even a custom role holding every permission isn't an owner.
    expect(canGrantRole(role("Everything", ALL_PERMISSIONS), owner)).toBe(false);
  });

  it("lets an owner grant any role", () => {
    for (const r of [manager, rep, role("Custom", ["calls.delete"])]) expect(canGrantRole(owner, r)).toBe(true);
  });

  it("lets a manager grant roles with no more access than their own", () => {
    expect(canGrantRole(manager, manager)).toBe(true);
    expect(canGrantRole(manager, rep)).toBe(true);
    expect(canGrantRole(manager, role("Uploader", ["calls.upload"]))).toBe(true);
  });

  it("stops a manager granting a role with a permission they don't have", () => {
    expect(canGrantRole(manager, role("Admin", ["calls.upload", "roles.manage"]))).toBe(false);
  });

  it("stops a rep granting anything beyond their own access", () => {
    expect(canGrantRole(rep, rep)).toBe(true);
    expect(canGrantRole(rep, manager)).toBe(false);
  });

  it("allows granting a role with no permissions", () => {
    expect(canGrantRole(rep, role("Viewer", []))).toBe(true);
  });
});

describe("withRequiredPermissions", () => {
  it("adds seeing every call to permissions that act on calls", () => {
    for (const p of ["calls.assign", "calls.review", "calls.delete", "coaching.manage"] as const) {
      expect(withRequiredPermissions([p])).toContain("calls.view_all");
    }
  });

  it("leaves permissions that need nothing alone", () => {
    expect(withRequiredPermissions(["calls.upload"])).toEqual(["calls.upload"]);
  });

  it("doesn't duplicate", () => {
    expect(withRequiredPermissions(["calls.review", "calls.view_all"]).filter((p) => p === "calls.view_all")).toHaveLength(1);
  });

  it("is satisfied by every default role", () => {
    for (const r of DEFAULT_ROLES) expect(withRequiredPermissions(r.permissions).sort()).toEqual([...r.permissions].sort());
  });
});

describe("seesAllCalls", () => {
  it("is true for owners and anyone with calls.view_all", () => {
    expect(seesAllCalls({ isOwner: true, permissions: [] })).toBe(true);
    expect(seesAllCalls({ isOwner: false, permissions: ["calls.view_all"] })).toBe(true);
  });
  it("is false for a rep who only sees their own calls", () => {
    expect(seesAllCalls({ isOwner: false, permissions: ["calls.upload"] })).toBe(false);
  });
});
