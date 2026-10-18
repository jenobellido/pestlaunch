import { describe, expect, it } from "vitest";
import { activeCallTypes, findCallType, mergeCallTypes, newCallTypeKey, type CallTypeOverride } from "./catalog";
import { BUILT_IN_CALL_TYPES } from "./types";

// Invented company changes.
const custom: CallTypeOverride = {
  key: "custom-1",
  name: "Commercial quote",
  description: "A business asks for a quote for their premises.",
  group: "sales",
  scorecard: null,
  enabled: true,
};

describe("mergeCallTypes", () => {
  it("gives every company the built-in types by default", () => {
    const types = mergeCallTypes([]);
    expect(types.map((t) => t.key)).toEqual([...BUILT_IN_CALL_TYPES]);
    expect(types.every((t) => t.builtIn && !t.customized && t.enabled)).toBe(true);
    expect(types.find((t) => t.key === "new_customer")?.scorecard?.id).toBe("sales");
  });

  it("lays a company's edit over the built-in and marks it customised", () => {
    const types = mergeCallTypes([{ ...custom, key: "billing", name: "Payments" }]);
    const billing = types.find((t) => t.key === "billing")!;
    expect(billing.name).toBe("Payments");
    expect(billing.customized).toBe(true);
    expect(types.filter((t) => t.key === "billing")).toHaveLength(1);
  });

  it("adds the company's own types after the built-ins", () => {
    const types = mergeCallTypes([custom]);
    expect(types.at(-1)).toMatchObject({ key: "custom-1", builtIn: false, group: "sales" });
  });

  it("files an unknown group under Other", () => {
    expect(mergeCallTypes([{ ...custom, group: "nonsense" }]).at(-1)?.group).toBe("other");
  });
});

describe("findCallType", () => {
  const catalog = mergeCallTypes([custom]);

  it("finds a type by key", () => {
    expect(findCallType(catalog, "custom-1").name).toBe("Commercial quote");
  });

  it("reads a removed type as unscored, so old calls still display", () => {
    const gone = findCallType(catalog, "custom-gone");
    expect(gone).toMatchObject({ name: "Removed type", scorecard: null, group: "other" });
  });

  it("falls back to the built-in default for a built-in key", () => {
    expect(findCallType([], "retention").scorecard?.id).toBe("retention");
  });
});

describe("activeCallTypes", () => {
  it("leaves out types the company turned off, but always keeps Other", () => {
    const catalog = mergeCallTypes([
      { ...custom, enabled: false },
      { key: "other", name: "Other", description: "Anything else.", group: "other", scorecard: null, enabled: false },
    ]);
    const keys = activeCallTypes(catalog).map((t) => t.key);
    expect(keys).not.toContain("custom-1");
    expect(keys).toContain("other");
  });
});

describe("newCallTypeKey", () => {
  it("makes a custom key", () => {
    expect(newCallTypeKey(() => "a1b2c3d4")).toBe("custom-a1b2c3d4");
  });
});
