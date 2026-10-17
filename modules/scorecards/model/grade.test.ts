import { describe, expect, it } from "vitest";
import { CALL_TYPES } from "@/core/calls";
import { SCORECARDS } from "../config/scorecards";
import { gradeFor, maxPoints, scorecardFor } from "./grade";
import type { Scorecard } from "./types";

const card: Scorecard = {
  id: "all_calls",
  name: "Test card",
  thresholds: { gold: 5, green: 4 },
  sections: [
    { title: "One", items: [{ name: "a", criteria: "" }, { name: "b", criteria: "" }] },
    { title: "Two", items: [{ name: "c", criteria: "" }, { name: "d", criteria: "" }, { name: "e", criteria: "" }] },
  ],
};

describe("maxPoints", () => {
  it("counts one point per item across sections", () => {
    expect(maxPoints(card)).toBe(5);
  });

  it("is 0 for a card with no items", () => {
    expect(maxPoints({ ...card, sections: [] })).toBe(0);
  });

  // The totals the call manuals give (see ARCHITECTURE.md, "Call types and scorecards").
  it.each([
    ["sales", 17],
    ["retention", 12],
    ["all_calls", 12],
  ] as const)("matches the manual for the %s scorecard", (id, total) => {
    expect(maxPoints(SCORECARDS[id])).toBe(total);
  });
});

describe("gradeFor", () => {
  it("gives gold at or above the gold threshold", () => {
    expect(gradeFor(card, 5)).toBe("gold");
  });

  it("gives green from the green threshold up to just below gold", () => {
    expect(gradeFor(card, 4)).toBe("green");
  });

  it("gives below under the green threshold, including zero", () => {
    expect(gradeFor(card, 3)).toBe("below");
    expect(gradeFor(card, 0)).toBe("below");
  });

  it("uses the manual's thresholds for sales calls: 17 gold, 14+ green", () => {
    const sales = SCORECARDS.sales;
    expect(gradeFor(sales, 17)).toBe("gold");
    expect(gradeFor(sales, 16)).toBe("green");
    expect(gradeFor(sales, 14)).toBe("green");
    expect(gradeFor(sales, 13)).toBe("below");
  });
});

describe("scorecardFor", () => {
  it.each([
    ["new_customer", "sales"],
    ["retention", "retention"],
    ["scheduling", "all_calls"],
    ["billing", "all_calls"],
    ["reservice", "all_calls"],
    ["other", null],
  ] as const)("grades %s calls with %s", (callType, expected) => {
    expect(scorecardFor(callType)).toBe(expected);
  });

  it("covers every call type", () => {
    for (const type of CALL_TYPES) expect(scorecardFor(type)).not.toBeUndefined();
  });
});
