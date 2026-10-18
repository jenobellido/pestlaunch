import { describe, expect, it } from "vitest";
import { shortPrice, summarize, type DashboardCall } from "./insights";

// Invented calls.
function call(overrides: Partial<DashboardCall>): DashboardCall {
  return {
    id: "c1",
    href: "/example/calls/c1",
    title: "c1",
    typeLabel: "New customer",
    group: "sales",
    employeeId: null,
    employeeName: "Sam",
    createdAt: "2026-01-01T10:00:00.000Z",
    durationSec: 120,
    status: "ready",
    resolution: "follow_up_needed",
    followUps: [],
    cancelReason: null,
    score: null,
    ...overrides,
  };
}

describe("shortPrice", () => {
  it("keeps the headline price", () => {
    expect(shortPrice("$149 initial; $49/month; $500 prepaid")).toBe("$149 initial");
    expect(shortPrice("$99 (first visit)")).toBe("$99");
  });

  it("is empty for no price", () => {
    expect(shortPrice(null)).toBeNull();
    expect(shortPrice("  ")).toBeNull();
  });
});

describe("sale not closed", () => {
  it("says who, what for and the price, with the next step", () => {
    const [leak] = summarize([
      call({ customer: "Pat Example", need: "Wasps; ants last spring", priceQuoted: "$149 initial; $49/month", followUps: ["Call back Monday"] }),
    ]).leaks;
    expect(leak).toMatchObject({
      kind: "sale_not_closed",
      detail: "Pat Example · Wasps · $149 initial",
      next: "Call back Monday",
    });
  });

  it("falls back to a plain line when the call gave no details", () => {
    const [leak] = summarize([call({})]).leaks;
    expect(leak.detail).toBe("The caller didn't book. Worth a call back.");
    expect(leak.next).toBeUndefined();
  });

  it("isn't a leak once the sale is booked", () => {
    expect(summarize([call({ resolution: "booked" })]).leaks).toHaveLength(0);
  });
});
