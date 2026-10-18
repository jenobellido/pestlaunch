import { describe, expect, it } from "vitest";
import { parseSentimentCodes } from "./codes";

const turns = [0, 1, 2, 3].map((i) => ({ start: i * 5, end: i * 5 + 4, speaker: i % 2 ? ("customer" as const) : ("employee" as const) }));

describe("parseSentimentCodes", () => {
  it("reads line number, tone and strength", () => {
    const result = parseSentimentCodes(["0p1", "1x3", "2n1", "3p2"], turns);
    expect(result.turns.map((t) => [t.sentiment, t.intensity])).toEqual([
      ["positive", 1],
      ["negative", 3],
      ["neutral", 1],
      ["positive", 2],
    ]);
  });

  it("keeps each turn's time and speaker", () => {
    const [first, second] = parseSentimentCodes(["0p1", "1x3"], turns).turns;
    expect(first).toMatchObject({ start: 0, end: 4, speaker: "employee" });
    expect(second).toMatchObject({ start: 5, end: 9, speaker: "customer" });
  });

  it("matches codes by line number, so a skipped line doesn't shift the rest", () => {
    const result = parseSentimentCodes(["0p1", "2x2", "3p3"], turns);
    expect(result.turns.map((t) => t.sentiment)).toEqual(["positive", "neutral", "negative", "positive"]);
  });

  it("treats garbled or out-of-range codes as neutral", () => {
    const result = parseSentimentCodes(["0q1", "1x9", " 2x2 ", "99p3", "x"], turns);
    expect(result.turns.map((t) => [t.sentiment, t.intensity])).toEqual([
      ["neutral", 1],
      ["neutral", 1],
      ["negative", 2],
      ["neutral", 1],
    ]);
  });

  it("always gives neutral a strength of 1", () => {
    expect(parseSentimentCodes(["0n3"], turns).turns[0].intensity).toBe(1);
  });
});
