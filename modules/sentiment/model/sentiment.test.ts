import { describe, expect, it } from "vitest";
import {
  customerMood,
  moodMoments,
  moodSentiment,
  moodSummary,
  sentimentRanges,
  sentimentShares,
  turnScore,
} from "./sentiment";
import type { Intensity, Sentiment, TurnSentiment } from "./types";

// Invented turns: [speaker, start, end, sentiment, intensity]
type Row = [TurnSentiment["speaker"], number, number, Sentiment, Intensity?];
const turns = (rows: Row[]): TurnSentiment[] =>
  rows.map(([speaker, start, end, sentiment, intensity = 2]) => ({ speaker, start, end, sentiment, intensity }));

describe("turnScore", () => {
  it("scales by intensity, signed by sentiment", () => {
    expect(turnScore({ sentiment: "positive", intensity: 3 })).toBe(1);
    expect(turnScore({ sentiment: "negative", intensity: 3 })).toBe(-1);
    expect(turnScore({ sentiment: "negative", intensity: 1 })).toBeCloseTo(-1 / 3);
    expect(turnScore({ sentiment: "neutral", intensity: 3 })).toBe(0);
  });
});

describe("sentimentRanges", () => {
  it("merges consecutive turns with the same sentiment, whoever speaks", () => {
    const ranges = sentimentRanges(
      turns([
        ["employee", 0, 4, "neutral"],
        ["customer", 4, 9, "neutral"],
        ["customer", 9, 15, "negative"],
        ["employee", 15, 20, "positive"],
      ]),
    );
    expect(ranges).toEqual([
      { start: 0, end: 9, sentiment: "neutral" },
      { start: 9, end: 15, sentiment: "negative" },
      { start: 15, end: 20, sentiment: "positive" },
    ]);
  });

  it("joins the silence between turns to the range before it, leaving no gaps", () => {
    const ranges = sentimentRanges(
      turns([
        ["customer", 0, 5, "negative"],
        ["employee", 8, 12, "positive"],
      ]),
    );
    expect(ranges[0].end).toBe(8);
    expect(ranges[1].start).toBe(8);
  });

  it("orders turns by time first", () => {
    const ranges = sentimentRanges(
      turns([
        ["employee", 10, 12, "positive"],
        ["customer", 0, 10, "negative"],
      ]),
    );
    expect(ranges.map((r) => r.sentiment)).toEqual(["negative", "positive"]);
  });

  it("is empty for no turns", () => {
    expect(sentimentRanges([])).toEqual([]);
  });
});

describe("sentimentShares", () => {
  it("weights by how long each turn lasts", () => {
    const shares = sentimentShares(
      turns([
        ["customer", 0, 30, "negative"],
        ["employee", 30, 40, "positive"],
        ["customer", 40, 100, "neutral"],
      ]),
    );
    expect(shares.negative).toBeCloseTo(0.3);
    expect(shares.positive).toBeCloseTo(0.1);
    expect(shares.neutral).toBeCloseTo(0.6);
  });

  it("is all zero with no talk time", () => {
    expect(sentimentShares([])).toEqual({ positive: 0, neutral: 0, negative: 0 });
  });
});

describe("customerMood", () => {
  it("follows only the customer, smoothing each turn with the ones before", () => {
    const points = customerMood(
      turns([
        ["customer", 0, 5, "negative", 3],
        ["employee", 5, 10, "positive", 3],
        ["customer", 10, 15, "positive", 3],
      ]),
    );
    expect(points.map((p) => p.at)).toEqual([0, 10]);
    expect(points[0].mood).toBe(-1);
    // Halfway from -1 toward 1.
    expect(points[1].mood).toBeCloseTo(0);
  });
});

describe("moodSentiment", () => {
  it("uses symmetric thresholds", () => {
    expect(moodSentiment(0.3)).toBe("positive");
    expect(moodSentiment(0)).toBe("neutral");
    expect(moodSentiment(-0.3)).toBe("negative");
  });
});

describe("moodMoments", () => {
  // A customer who gets upset, is calmed down, then ends happy.
  const call = turns([
    ["customer", 0, 5, "neutral"],
    ["customer", 10, 15, "negative", 3],
    ["customer", 20, 25, "negative", 3],
    ["employee", 25, 30, "positive"],
    ["customer", 30, 35, "positive", 3],
    ["customer", 40, 45, "positive", 3],
  ]);

  it("finds where the customer turned negative and where they recovered", () => {
    const moments = moodMoments(call);
    expect(moments.map((m) => [m.kind, m.at])).toEqual([
      ["turned_negative", 10],
      ["recovered", 30],
      ["turned_positive", 40],
    ]);
  });

  it("points each moment at the customer's own turn", () => {
    for (const m of moodMoments(call)) expect(m.turn.speaker).toBe("customer");
  });

  it("counts a customer who opens the call upset", () => {
    const moments = moodMoments(
      turns([
        ["customer", 0, 5, "negative", 3],
        ["customer", 10, 15, "negative", 2],
      ]),
    );
    expect(moments.map((m) => [m.kind, m.at])).toEqual([["turned_negative", 0]]);
  });

  it("caps the number of moments", () => {
    expect(moodMoments(call, 1)).toHaveLength(1);
  });

  it("finds nothing in a call that stays calm", () => {
    expect(
      moodMoments(
        turns([
          ["customer", 0, 5, "neutral"],
          ["customer", 10, 15, "neutral"],
        ]),
      ),
    ).toEqual([]);
  });
});

describe("moodSummary", () => {
  it("compares the first and last third of the customer's turns", () => {
    const summary = moodSummary(
      turns([
        ["customer", 0, 5, "negative", 3],
        ["customer", 10, 15, "neutral"],
        ["customer", 20, 25, "positive", 3],
      ]),
    );
    expect(summary).toEqual({ start: "negative", end: "positive", trend: "improved" });
  });

  it("reports a call that went badly", () => {
    expect(
      moodSummary(
        turns([
          ["customer", 0, 5, "positive", 2],
          ["customer", 10, 15, "negative", 3],
        ]),
      )?.trend,
    ).toBe("worsened");
  });

  it("is null when the customer barely spoke", () => {
    expect(moodSummary(turns([["customer", 0, 5, "negative"]]))).toBeNull();
    expect(moodSummary(turns([["employee", 0, 5, "positive"]]))).toBeNull();
  });
});
