import { describe, expect, it } from "vitest";
import { summarizeTeam, type CoachingCall } from "./team";

// Invented team members and calls.
let nextId = 0;
function call(overrides: Partial<CoachingCall> & { day: number }): CoachingCall {
  const { day, ...rest } = overrides;
  const id = `call-${++nextId}`;
  return {
    id,
    href: `/example/calls/${id}`,
    title: id,
    callType: "Scheduling",
    employeeId: null,
    employeeName: null,
    createdAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
    ...rest,
  };
}

const score = (points: number, maxPoints: number, missed: string[] = [], grade: "gold" | "green" | "below" = "below") => ({
  points,
  maxPoints,
  grade,
  missed,
});

describe("summarizeTeam", () => {
  it("returns nothing for no calls", () => {
    expect(summarizeTeam([])).toEqual([]);
  });

  it("groups by team member, even when the heard name differs", () => {
    const [summary] = summarizeTeam([
      call({ day: 1, employeeId: "u1", employeeName: "Robin" }),
      call({ day: 2, employeeId: "u1", employeeName: "Robbie" }),
    ]);
    expect(summary.calls).toHaveLength(2);
  });

  it("keeps different members apart even with the same name", () => {
    const summaries = summarizeTeam([
      call({ day: 1, employeeId: "u1", employeeName: "Sam" }),
      call({ day: 2, employeeId: "u2", employeeName: "Sam" }),
    ]);
    expect(summaries).toHaveLength(2);
  });

  it("groups unassigned calls by the heard name, ignoring case and spaces", () => {
    const summaries = summarizeTeam([
      call({ day: 1, employeeName: "Jordan" }),
      call({ day: 2, employeeName: " jordan " }),
      call({ day: 3, employeeName: "Casey" }),
    ]);
    expect(summaries.map((s) => s.calls.length)).toEqual([2, 1]);
  });

  it("doesn't merge an unassigned call into a member with the same name", () => {
    const summaries = summarizeTeam([
      call({ day: 1, employeeId: "u1", employeeName: "Jordan" }),
      call({ day: 2, employeeName: "Jordan" }),
    ]);
    expect(summaries).toHaveLength(2);
  });

  it("puts calls with no name under Unknown rep, listed last", () => {
    const summaries = summarizeTeam([
      call({ day: 1 }),
      call({ day: 2, employeeName: "  " }),
      call({ day: 3 }),
      call({ day: 4, employeeName: "Casey" }),
    ]);
    expect(summaries.map((s) => [s.name, s.calls.length])).toEqual([
      ["Casey", 1],
      ["Unknown rep", 3],
    ]);
  });

  it("orders people by number of calls, most first", () => {
    const summaries = summarizeTeam([
      call({ day: 1, employeeName: "Casey" }),
      call({ day: 2, employeeName: "Jordan" }),
      call({ day: 3, employeeName: "Jordan" }),
    ]);
    expect(summaries.map((s) => s.name)).toEqual(["Jordan", "Casey"]);
  });

  it("lists each person's calls newest first", () => {
    const [summary] = summarizeTeam([
      call({ day: 1, employeeName: "Casey", title: "old" }),
      call({ day: 3, employeeName: "Casey", title: "new" }),
      call({ day: 2, employeeName: "Casey", title: "mid" }),
    ]);
    expect(summary.calls.map((c) => c.title)).toEqual(["new", "mid", "old"]);
  });

  it("averages scores as a share of points, so scorecards of different sizes compare", () => {
    const [summary] = summarizeTeam([
      call({ day: 1, employeeName: "Casey", score: score(17, 17, [], "gold") }),
      call({ day: 2, employeeName: "Casey", score: score(6, 12) }),
      call({ day: 3, employeeName: "Casey" }),
    ]);
    expect(summary.scoredCalls).toBe(2);
    expect(summary.averageScore).toBe(75);
    expect(summary.grades).toEqual({ gold: 1, green: 0, below: 1 });
  });

  it("has no average or trend without scored calls", () => {
    const [summary] = summarizeTeam([call({ day: 1, employeeName: "Casey" })]);
    expect(summary.averageScore).toBeNull();
    expect(summary.trend).toBeNull();
  });

  it("needs two scored calls for a trend", () => {
    const [summary] = summarizeTeam([call({ day: 1, employeeName: "Casey", score: score(5, 10) })]);
    expect(summary.trend).toBeNull();
  });

  it("measures the trend as the newest half's average minus the oldest half's", () => {
    const [summary] = summarizeTeam([
      // Given out of order: the trend must follow call dates.
      call({ day: 4, employeeName: "Casey", score: score(9, 10) }),
      call({ day: 1, employeeName: "Casey", score: score(4, 10) }),
      call({ day: 3, employeeName: "Casey", score: score(7, 10) }),
      call({ day: 2, employeeName: "Casey", score: score(6, 10) }),
    ]);
    // Newest half: 70 and 90, average 80. Oldest half: 40 and 60, average 50.
    expect(summary.trend).toBe(30);
  });

  it("leaves the middle call out of the trend when the count is odd", () => {
    const [summary] = summarizeTeam([
      call({ day: 1, employeeName: "Casey", score: score(8, 10) }),
      call({ day: 2, employeeName: "Casey", score: score(8, 10) }),
      call({ day: 3, employeeName: "Casey", score: score(0, 10) }),
      call({ day: 4, employeeName: "Casey", score: score(6, 10) }),
      call({ day: 5, employeeName: "Casey", score: score(6, 10) }),
    ]);
    expect(summary.trend).toBeCloseTo(-20);
  });

  it("gives no trend until there are 4 scored calls", () => {
    const [summary] = summarizeTeam([
      call({ day: 1, employeeName: "Casey", score: score(8, 10) }),
      call({ day: 2, employeeName: "Casey", score: score(2, 10) }),
      call({ day: 3, employeeName: "Casey", score: score(6, 10) }),
    ]);
    expect(summary.trend).toBeNull();
  });

  it("ranks the three most-missed items, counting each call once", () => {
    const [summary] = summarizeTeam([
      call({ day: 1, employeeName: "Casey", score: score(1, 5, ["Close", "Close", "Empathy", "Recap"]) }),
      call({ day: 2, employeeName: "Casey", score: score(2, 5, ["Close", "Empathy", "Greeting"]) }),
      call({ day: 3, employeeName: "Casey", score: score(3, 5, ["Close", "Address"]) }),
    ]);
    expect(summary.topMissed).toEqual([
      { item: "Close", count: 3 },
      { item: "Empathy", count: 2 },
      // Ties are broken alphabetically.
      { item: "Address", count: 1 },
    ]);
  });

  it("takes the focus from the newest coached call", () => {
    const feedback = (focus: string) => ({ strengths: [], improvements: [], focus });
    const [summary] = summarizeTeam([
      call({ day: 1, employeeName: "Casey", coaching: feedback("Recap the visit") }),
      call({ day: 2, employeeName: "Casey", coaching: feedback("Ask for the sale") }),
      call({ day: 3, employeeName: "Casey" }),
    ]);
    expect(summary.latestFocus).toBe("Ask for the sale");
  });
});
