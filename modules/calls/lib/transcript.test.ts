import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "@/core/calls";
import { countWords, isExactSplit, isSpeech, mergeTurns, splitSegment } from "./transcript";

// Invented lines only.
const seg = (start: number, end: number, text: string, no_speech_prob?: number) => ({ start, end, text, no_speech_prob });
const line = (speaker: TranscriptSegment["speaker"], start: number, end: number, text: string): TranscriptSegment => ({
  speaker,
  start,
  end,
  text,
});

describe("isSpeech", () => {
  it("keeps ordinary speech", () => {
    expect(isSpeech(seg(0, 2, "Good morning, Example Pest.", 0.1), 60)).toBe(true);
  });

  it("drops empty and whitespace-only text", () => {
    expect(isSpeech(seg(0, 2, "   "), 60)).toBe(false);
  });

  it("drops segments Whisper marks as likely non-speech", () => {
    expect(isSpeech(seg(0, 2, "Thank you.", 0.7), 60)).toBe(false);
    expect(isSpeech(seg(0, 2, "Thank you.", 0.5), 60)).toBe(true);
  });

  it("treats a missing no-speech probability as speech", () => {
    expect(isSpeech(seg(0, 2, "Hello?"), 60)).toBe(true);
  });

  it("drops segments that start at or after the end of the audio", () => {
    expect(isSpeech(seg(60, 62, "Bye now."), 60)).toBe(false);
    expect(isSpeech(seg(59, 62, "Bye now."), 60)).toBe(true);
  });

  it("ignores the end check when the duration is unknown", () => {
    expect(isSpeech(seg(500, 502, "Still here."), 0)).toBe(true);
  });
});

describe("countWords", () => {
  it("counts words across segments", () => {
    expect(countWords([{ text: "I have ants" }, { text: "  in the  kitchen " }])).toBe(6);
  });

  it("counts nothing for empty text", () => {
    expect(countWords([{ text: "" }, { text: "   " }])).toBe(0);
  });
});

describe("isExactSplit", () => {
  const original = "Can I get your address? Sure, it's 12 Sample Road.";

  it("accepts pieces that are exactly the line's words", () => {
    expect(
      isExactSplit(
        [
          { speaker: "employee", text: "Can I get your address?" },
          { speaker: "customer", text: "Sure, it's 12 Sample Road." },
        ],
        original,
      ),
    ).toBe(true);
  });

  it("ignores punctuation and casing differences", () => {
    expect(
      isExactSplit(
        [
          { speaker: "employee", text: "can i get your address" },
          { speaker: "customer", text: "SURE it's 12 sample road" },
        ],
        original,
      ),
    ).toBe(true);
  });

  it("rejects pieces that add, drop or change words", () => {
    const employee = { speaker: "employee" as const, text: "Can I get your address?" };
    expect(isExactSplit([employee, { speaker: "customer", text: "Sure, it's 12 Sample Road, thanks." }], original)).toBe(false);
    expect(isExactSplit([employee, { speaker: "customer", text: "Sure, 12 Sample Road." }], original)).toBe(false);
    expect(isExactSplit([employee, { speaker: "customer", text: "Sure, it's 14 Sample Road." }], original)).toBe(false);
  });

  it("rejects a single piece, since that isn't a split", () => {
    expect(isExactSplit([{ speaker: "employee", text: original }], original)).toBe(false);
  });
});

describe("splitSegment", () => {
  it("shares the segment's time out by text length, end to end", () => {
    const pieces = splitSegment({ start: 10, end: 13 }, [
      { speaker: "employee", text: "aaaaaa" },
      { speaker: "customer", text: "bbb" },
    ]);
    expect(pieces).toEqual([
      { speaker: "employee", start: 10, end: 12, text: "aaaaaa" },
      { speaker: "customer", start: 12, end: 13, text: "bbb" },
    ]);
  });

  it("trims each piece's text", () => {
    const [piece] = splitSegment({ start: 0, end: 1 }, [{ speaker: "customer", text: "  Yes.  " }]);
    expect(piece.text).toBe("Yes.");
  });

  it("doesn't divide by zero when every piece is empty", () => {
    const pieces = splitSegment({ start: 5, end: 7 }, [
      { speaker: "employee", text: "" },
      { speaker: "customer", text: "" },
    ]);
    expect(pieces.every((p) => Number.isFinite(p.start) && Number.isFinite(p.end))).toBe(true);
  });
});

describe("mergeTurns", () => {
  it("joins consecutive lines from the same speaker", () => {
    const turns = mergeTurns([line("employee", 0, 2, "Hello,"), line("employee", 2.5, 4, "how can I help?")]);
    expect(turns).toEqual([line("employee", 0, 4, "Hello, how can I help?")]);
  });

  it("keeps different speakers apart", () => {
    const turns = mergeTurns([line("employee", 0, 2, "Hello."), line("customer", 2, 4, "Hi.")]);
    expect(turns).toHaveLength(2);
  });

  it("doesn't join across a pause of two seconds or more", () => {
    const turns = mergeTurns([line("customer", 0, 2, "One moment."), line("customer", 4, 5, "Okay, back.")]);
    expect(turns).toHaveLength(2);
  });

  it("starts a new turn once a turn would pass 30 seconds", () => {
    const turns = mergeTurns([
      line("employee", 0, 14, "First part."),
      line("employee", 14.5, 28, "Second part."),
      line("employee", 28.5, 33, "Third part."),
    ]);
    expect(turns.map((t) => [t.start, t.end])).toEqual([
      [0, 28],
      [28.5, 33],
    ]);
  });

  it("doesn't change its input", () => {
    const input = [line("employee", 0, 1, "A."), line("employee", 1, 2, "B.")];
    mergeTurns(input);
    expect(input[0]).toEqual(line("employee", 0, 1, "A."));
  });
});
