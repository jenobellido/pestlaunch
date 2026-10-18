import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "@/core/calls";
import { callReviewFlags } from "./review";

const line = (speaker: TranscriptSegment["speaker"], words: number): TranscriptSegment => ({
  speaker,
  start: 0,
  end: 1,
  text: Array.from({ length: words }, () => "word").join(" "),
});

const base = { status: "ready", employeeId: "u1", heardEmployeeName: "Jordan" };

describe("callReviewFlags", () => {
  it("flags nothing on a balanced, attributed call", () => {
    expect(callReviewFlags({ ...base, transcript: [line("employee", 30), line("customer", 30)] })).toEqual([]);
  });

  it("ignores calls that aren't ready", () => {
    expect(callReviewFlags({ ...base, status: "processing", employeeId: null, heardEmployeeName: null })).toEqual([]);
  });

  it("flags a call with no rep", () => {
    expect(callReviewFlags({ ...base, employeeId: null, heardEmployeeName: null, transcript: [] })).toEqual([
      "No rep was identified on the call.",
    ]);
  });

  it("flags a call mostly without speakers", () => {
    const flags = callReviewFlags({ ...base, transcript: [line("unknown", 40), line("employee", 20), line("customer", 20)] });
    expect(flags).toEqual(["Much of the call couldn't be put to a speaker."]);
  });

  it("flags lopsided speaker labels", () => {
    const flags = callReviewFlags({ ...base, transcript: [line("employee", 95), line("customer", 5)] });
    expect(flags).toEqual(["The speaker labels look lopsided; check who said what."]);
  });

  it("doesn't judge very short calls on speaker share", () => {
    expect(callReviewFlags({ ...base, transcript: [line("employee", 20)] })).toEqual([]);
  });
});
