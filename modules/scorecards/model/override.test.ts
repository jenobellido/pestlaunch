import { describe, expect, it } from "vitest";
import { SCORECARDS } from "../config/scorecards";
import { maxPoints } from "./grade";
import { overrideScorecardItem } from "./override";
import type { ScorecardResult } from "./types";

// Invented grading of an "All Calls" scorecard: every item passed except the last one.
function allCallsResult(): ScorecardResult {
  const card = SCORECARDS.all_calls;
  const items = card.sections.flatMap((s) =>
    s.items.map((i) => ({ section: s.title, item: i.name, passed: true, evidence: null, reason: "Did it." })),
  );
  items[items.length - 1] = { ...items[items.length - 1], passed: false, reason: "Missed." };
  return { scorecardId: "all_calls", points: items.length - 1, maxPoints: maxPoints(card), grade: "green", items };
}

describe("overrideScorecardItem", () => {
  it("flips an item, marks it corrected and regrades", () => {
    const before = allCallsResult();
    const after = overrideScorecardItem(before, before.items.length - 1, true, "Corrected by a manager.");
    expect(after.points).toBe(12);
    expect(after.grade).toBe("gold");
    expect(after.items.at(-1)).toMatchObject({ passed: true, corrected: true, reason: "Corrected by a manager." });
  });

  it("can take a point away too", () => {
    const after = overrideScorecardItem(allCallsResult(), 0, false, "Didn't really validate.");
    expect(after.points).toBe(10);
    expect(after.grade).toBe("below");
  });

  it("doesn't change the original result", () => {
    const before = allCallsResult();
    overrideScorecardItem(before, 0, false, "x");
    expect(before.items[0].passed).toBe(true);
  });

  it("rejects an item that doesn't exist", () => {
    expect(() => overrideScorecardItem(allCallsResult(), 99, true, "x")).toThrow(RangeError);
  });
});
