import { describe, expect, it } from "vitest";
import type { CallRecord } from "../model/types";
import { matchCall, rankCalls, titleOf } from "./search";

// Invented calls.
function call(id: string, overrides: Partial<CallRecord> = {}): CallRecord {
  return {
    id,
    tenant: "example",
    fileName: `${id}.mp3`,
    employeeName: null,
    employeeId: null,
    heardEmployeeName: null,
    status: "ready",
    createdAt: "2026-01-01T10:00:00.000Z",
    analyses: {},
    ...overrides,
  };
}

const booked = call("tuesday-quote", {
  employeeName: "Sam",
  callType: "new_customer",
  createdAt: "2026-01-03T10:00:00.000Z",
  outcome: {
    summary: "A homeowner asked about wasps and booked an initial visit.",
    resolution: "booked",
    details: [
      { label: "Customer name", value: "Pat Example" },
      { label: "Pest", value: "Wasps" },
    ],
    followUps: [],
    cancelReason: null,
  },
});
const cancel = call("friday-cancel", {
  employeeName: "Alex",
  callType: "retention",
  createdAt: "2026-01-02T10:00:00.000Z",
  outcome: {
    summary: "The customer is moving and cancelled; Pat on the team was mentioned.",
    resolution: "cancelled",
    details: [{ label: "Cancellation reason", value: "Moving" }],
    followUps: [],
    cancelReason: "Moving",
  },
});

describe("titleOf", () => {
  it("drops the extension", () => {
    expect(titleOf("monday-call.mp3")).toBe("monday-call");
    expect(titleOf("no-extension")).toBe("no-extension");
  });
});

describe("matchCall", () => {
  it("needs every word to appear somewhere", () => {
    expect(matchCall(booked, "pat wasps")).not.toBeNull();
    expect(matchCall(booked, "pat termites")).toBeNull();
  });

  it("matches the call type and plain words for the result", () => {
    expect(matchCall(cancel, "retention")).not.toBeNull();
    expect(matchCall(cancel, "canceled")).not.toBeNull();
    expect(matchCall(booked, "booked")).not.toBeNull();
  });

  it("shows the field that matched", () => {
    expect(matchCall(booked, "wasps")?.snippet).toBe("Pest: Wasps");
  });

  it("falls back to the summary when only the summary matched", () => {
    expect(matchCall(cancel, "team")?.snippet).toBe(cancel.outcome?.summary);
  });

  it("ignores case", () => {
    expect(matchCall(booked, "SAM")).not.toBeNull();
  });
});

describe("rankCalls", () => {
  it("returns the newest calls, as given, for an empty query", () => {
    expect(rankCalls([booked, cancel], "  ", new Map(), 1).map((h) => h.id)).toEqual(["tuesday-quote"]);
  });

  it("puts a customer-name match above a summary mention", () => {
    expect(rankCalls([cancel, booked], "pat", new Map(), 5).map((h) => h.id)).toEqual(["tuesday-quote", "friday-cancel"]);
  });

  it("adds calls that only match in the transcript, after the others, with the line", () => {
    const lines = new Map([["friday-cancel", "We saw wasps by the garage"]]);
    const hits = rankCalls([booked, cancel], "wasps", lines, 5);
    expect(hits.map((h) => h.id)).toEqual(["tuesday-quote", "friday-cancel"]);
    expect(hits[1].snippet).toBe("“We saw wasps by the garage”");
  });

  it("describes each call by type and rep", () => {
    expect(rankCalls([booked], "", new Map(), 5)[0].meta).toBe("New customer · Sam");
  });

  it("caps the results", () => {
    expect(rankCalls([booked, cancel], "a", new Map(), 1)).toHaveLength(1);
  });
});
