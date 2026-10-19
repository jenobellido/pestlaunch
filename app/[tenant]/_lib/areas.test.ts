import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, DEFAULT_ROLES } from "@/core/tenancy/permissions";
import { areasFor } from "./areas";

const role = (key: "owner" | "manager" | "rep") => DEFAULT_ROLES.find((r) => r.key === key)!.permissions;

describe("areasFor", () => {
  it("keeps a rep to their own work and their own profile", () => {
    const a = areasFor(role("rep"));
    expect(a.team).toBe(false);
    expect(a.settings).toEqual({ profile: true, appearance: true, members: false, roles: false, company: false, callTypes: false });
    expect(a.exampleData).toBe(false);
  });

  it("lets a manager see the team and its members, but not company setup", () => {
    const a = areasFor(role("manager"));
    expect(a.team).toBe(true);
    expect(a.settings.members).toBe(true);
    expect(a.settings.roles).toBe(true);
    expect(a.settings.company).toBe(false);
    expect(a.settings.callTypes).toBe(false);
    expect(a.exampleData).toBe(false);
  });

  it("opens everything to an owner", () => {
    const a = areasFor(ALL_PERMISSIONS);
    expect(a.team && a.exampleData && Object.values(a.settings).every(Boolean)).toBe(true);
  });

  it("follows the permissions, not role names", () => {
    expect(areasFor(["calltypes.manage"]).settings.callTypes).toBe(true);
    expect(areasFor(["modules.manage"]).settings.company).toBe(true);
    expect(areasFor(["modules.manage"]).exampleData).toBe(false);
  });
});
