import { describe, expect, it } from "vitest";
import { defaultCallType } from "@/core/calls";
import { blankInput, callTypeInput, toInput, toOverride, type CallTypeInput } from "./input";

// An invented call type.
const valid: CallTypeInput = {
  name: "Commercial quote",
  description: "A business asks for a quote for regular pest control at their premises.",
  group: "sales",
  enabled: true,
  scored: true,
  scorecardName: "",
  sections: [
    {
      title: "Understand",
      autoAward: false,
      items: [
        { name: "Site details", criteria: "Asks about the site size, the pests seen and opening hours." },
        { name: "Decision maker", criteria: "Finds out who signs off on the contract." },
      ],
    },
  ],
  gold: 2,
  green: 1,
};

describe("callTypeInput", () => {
  it("accepts a complete type", () => {
    expect(callTypeInput.safeParse(valid).success).toBe(true);
  });

  it("needs a description the AI can sort calls by", () => {
    expect(callTypeInput.safeParse({ ...valid, description: "Quotes" }).success).toBe(false);
  });

  it("keeps Gold within the number of steps, and Green at or below Gold", () => {
    expect(callTypeInput.safeParse({ ...valid, gold: 3 }).success).toBe(false);
    expect(callTypeInput.safeParse({ ...valid, green: 3, gold: 2 }).success).toBe(false);
  });

  it("needs at least one step when the type is scored", () => {
    expect(callTypeInput.safeParse({ ...valid, sections: [] }).success).toBe(false);
  });

  it("allows an unscored type with no steps", () => {
    expect(callTypeInput.safeParse({ ...valid, scored: false, sections: [] }).success).toBe(true);
  });

  it("needs every step to say what passing looks like", () => {
    const sections = [{ ...valid.sections[0], items: [{ name: "Site details", criteria: "" }] }];
    expect(callTypeInput.safeParse({ ...valid, sections }).success).toBe(false);
  });
});

describe("toOverride", () => {
  it("keys the scorecard by the call type, so it never mixes with a shared default", () => {
    const saved = toOverride("custom-abc", valid);
    expect(saved.scorecard?.id).toBe("custom-abc");
    expect(saved.scorecard?.name).toBe("Commercial quote calls");
    expect(saved.scorecard?.thresholds).toEqual({ gold: 2, green: 1 });
  });

  it("saves no scorecard for an unscored type", () => {
    expect(toOverride("custom-abc", { ...valid, scored: false }).scorecard).toBeNull();
  });

  it("keeps the objection rule on the sections that have it", () => {
    const sections = [{ ...valid.sections[0], autoAward: true }];
    expect(toOverride("k", { ...valid, sections }).scorecard?.sections[0].autoAwardWhenNotApplicable).toBe(true);
  });
});

describe("toInput", () => {
  it("round-trips a built-in type's scorecard", () => {
    const sales = defaultCallType("new_customer");
    const input = toInput(sales);
    expect(callTypeInput.safeParse(input).success).toBe(true);
    expect(toOverride("new_customer", input).scorecard?.sections).toEqual(
      sales.scorecard?.sections.map((s) => ({ title: s.title, items: s.items, ...(s.autoAwardWhenNotApplicable ? { autoAwardWhenNotApplicable: true } : {}) })),
    );
  });

  it("starts a new type with the manuals' four steps", () => {
    expect(blankInput().sections.map((s) => s.title)).toEqual(["Validate", "Understand", "Solve", "Verify"]);
  });
});
