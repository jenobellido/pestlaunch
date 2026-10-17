import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "@/core/calls";
import { scoreCall, type ModelGrading } from "./score-call";
import type { Scorecard } from "./types";

// An invented call and a small scorecard; items are numbered 0..4 in scorecard order.
const card: Scorecard = {
  id: "sales",
  name: "Test sales card",
  thresholds: { gold: 5, green: 4 },
  sections: [
    { title: "Validate", items: [{ name: "Greeting", criteria: "" }, { name: "Empathy", criteria: "" }] },
    { title: "Close", items: [{ name: "Ask for the sale", criteria: "" }] },
    {
      title: "Objections",
      autoAwardWhenNotApplicable: true,
      items: [{ name: "Acknowledge", criteria: "" }, { name: "Respond", criteria: "" }],
    },
  ],
};

const transcript: TranscriptSegment[] = [
  { speaker: "employee", start: 0, end: 3, text: "Thanks for calling Example Pest, this is Robin." },
  { speaker: "customer", start: 3, end: 6, text: "Hi, I'm so sorry to bother you, I have ants." },
  { speaker: "employee", start: 6, end: 9, text: "No trouble at all! Would you like to get started today?" },
  { speaker: "unknown", start: 9, end: 10, text: "Your call may be recorded." },
];

const judge = (item: number, passed: boolean, evidence: string | null = null) => ({
  item,
  passed,
  evidence,
  reason: ` Reason for item ${item}. `,
});

function grading(overrides: Partial<ModelGrading> = {}): ModelGrading {
  return {
    objectionsRaised: true,
    items: [
      judge(0, true, "thanks for calling example pest"),
      judge(1, false),
      judge(2, true, "Would you like to get started today?"),
      judge(3, false),
      judge(4, false),
    ],
    ...overrides,
  };
}

describe("scoreCall", () => {
  it("counts passed items and grades with the card's thresholds", () => {
    const result = scoreCall(card, grading(), transcript);
    expect(result).toMatchObject({ scorecardId: "sales", points: 2, maxPoints: 5, grade: "below" });
    expect(result.items.map((i) => i.passed)).toEqual([true, false, true, false, false]);
  });

  it("keeps a quote that matches the employee's words, ignoring case and punctuation", () => {
    const [greeting, , close] = scoreCall(card, grading(), transcript).items;
    expect(greeting.evidence).toBe("thanks for calling example pest");
    expect(close.evidence).toBe("Would you like to get started today?");
  });

  it("drops a quote that isn't in the transcript but keeps the model's verdict", () => {
    const result = scoreCall(card, grading({ items: [judge(0, true, "Good morning and welcome")] }), transcript);
    expect(result.items[0]).toMatchObject({ passed: true, evidence: null });
  });

  it("fails an item whose only evidence is the customer's words", () => {
    const result = scoreCall(card, grading({ items: [judge(1, true, "I'm so sorry to bother you")] }), transcript);
    expect(result.items[1]).toMatchObject({
      passed: false,
      evidence: null,
      reason: "Only the customer said this; the employee didn't.",
    });
  });

  it("accepts quotes from unlabelled lines", () => {
    const result = scoreCall(card, grading({ items: [judge(0, true, "your call may be recorded")] }), transcript);
    expect(result.items[0].evidence).toBe("your call may be recorded");
  });

  it("marks items the model skipped as not assessed", () => {
    const result = scoreCall(card, grading({ items: [] }), transcript);
    expect(result.items[0]).toMatchObject({ passed: false, evidence: null, reason: "Not assessed." });
  });

  it("awards the objection section automatically when no objections were raised", () => {
    const result = scoreCall(card, grading({ objectionsRaised: false }), transcript);
    const objections = result.items.filter((i) => i.section === "Objections");
    expect(objections).toHaveLength(2);
    expect(objections.every((i) => i.passed && i.autoAwarded)).toBe(true);
    expect(result.points).toBe(4);
    expect(result.grade).toBe("green");
  });

  it("judges the objection section normally when objections were raised", () => {
    const result = scoreCall(card, grading({ objectionsRaised: true }), transcript);
    expect(result.items.filter((i) => i.autoAwarded)).toHaveLength(0);
  });

  it("trims the model's reasons", () => {
    expect(scoreCall(card, grading(), transcript).items[1].reason).toBe("Reason for item 1.");
  });
});
