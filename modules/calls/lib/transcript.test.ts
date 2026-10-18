import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "@/core/calls";
import { countWords, dropRepeats, isExactSplit, isSpeech, mergeTurns, REDACTED, redactPaymentDetails, splitSegment } from "./transcript";

// Invented lines only.
const seg = (start: number, end: number, text: string, no_speech_prob?: number, avg_logprob?: number) => ({
  start,
  end,
  text,
  no_speech_prob,
  avg_logprob,
});
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

  it("drops likely silence only when the text is also a low-confidence guess", () => {
    expect(isSpeech(seg(0, 2, "Thank you.", 0.7, -1.4), 60)).toBe(false);
    expect(isSpeech(seg(0, 2, "Thank you.", 0.5, -1.4), 60)).toBe(true);
  });

  it("keeps confident speech even when the window's no-speech score is high", () => {
    // whisper-1 shares the score across a 30-second window, so real speech can score 0.58.
    expect(isSpeech(seg(0, 2, "We can come out on Tuesday.", 0.58, -0.27), 60)).toBe(true);
  });

  it("drops very repetitive text, which is Whisper stuck in a loop", () => {
    expect(isSpeech({ start: 0, end: 30, text: "I can come. I can come. I can come.", compression_ratio: 3.1 }, 60)).toBe(false);
    expect(isSpeech({ start: 0, end: 3, text: "I can come Tuesday.", compression_ratio: 1.2 }, 60)).toBe(true);
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

// Invented, obviously fake numbers (the standard test card), never real ones.
describe("redactPaymentDetails", () => {
  const line = (start: number, text: string) => ({ start, end: start + 2, text });

  it("masks a card read out in groups after it's asked for, and the expiry and code", () => {
    const { segments, redacted } = redactPaymentDetails([
      line(0, "What card would you like to use?"),
      line(5, "4111."),
      line(8, "4111, yep."),
      line(11, "1111 1111."),
      line(15, "And the expiration?"),
      line(18, "08/29."),
      line(22, "And the security code on the back?"),
      line(25, "123."),
    ]);
    expect(segments.map((s) => s.text)).toEqual([
      "What card would you like to use?",
      `${REDACTED}.`,
      `${REDACTED}, yep.`,
      `${REDACTED}.`,
      "And the expiration?",
      `${REDACTED}.`,
      "And the security code on the back?",
      `${REDACTED}.`,
    ]);
    expect(redacted).toBe(5);
  });

  it("leaves numbers alone when nobody mentioned a card", () => {
    const input = [line(0, "The house is at 42 Example Lane."), line(4, "Between 10 and 12 works.")];
    expect(redactPaymentDetails(input).segments).toEqual(input);
  });

  it("keeps percentages inside the payment window", () => {
    const { segments } = redactPaymentDetails([line(0, "Is that on the card?"), line(4, "He did 80% of the job.")]);
    expect(segments[1].text).toBe("He did 80% of the job.");
  });

  it("keeps prices and phone numbers inside the payment window", () => {
    const { segments } = redactPaymentDetails([
      line(0, "I'll put the $149 initial on the card."),
      line(4, "Text me at 555-010-0199 when he's on the way."),
    ]);
    expect(segments.map((s) => s.text)).toEqual([
      "I'll put the $149 initial on the card.",
      "Text me at 555-010-0199 when he's on the way.",
    ]);
  });

  it("closes the window a minute after the last card detail", () => {
    const { segments } = redactPaymentDetails([line(0, "Which card?"), line(5, "4111."), line(200, "Gate code is 2468.")]);
    expect(segments[2].text).toBe("Gate code is 2468.");
  });

  it("masks digits read out a while after the card was mentioned, before the expiry is asked", () => {
    const { segments } = redactPaymentDetails([
      line(0, "I can take the card whenever you're ready."),
      line(150, "Okay. 4111."),
      line(155, "4111."),
      line(160, "Yep. 1111."),
      line(170, "1111. And expiration?"),
    ]);
    expect(segments.slice(1).map((s) => s.text)).toEqual([
      `Okay. ${REDACTED}.`,
      `${REDACTED}.`,
      `Yep. ${REDACTED}.`,
      `${REDACTED}. And expiration?`,
    ]);
  });

  it("masks a read-back of digit groups even when no card was mentioned", () => {
    const { segments } = redactPaymentDetails([line(0, "Okay. 4111."), line(3, "4111, yes.")]);
    expect(segments.map((s) => s.text)).toEqual([`Okay. ${REDACTED}.`, `${REDACTED}, yes.`]);
  });

  it("leaves a lone number in conversation alone", () => {
    const input = [line(0, "Unit 204."), line(4, "Great, and is there parking out front?")];
    expect(redactPaymentDetails(input).segments).toEqual(input);
  });

  it("masks a whole card number anywhere, even without a cue", () => {
    expect(redactPaymentDetails([line(0, "It's 4111 1111 1111 1111.")]).segments[0].text).toBe(`It's ${REDACTED}.`);
  });
});

describe("dropRepeats", () => {
  const t = (text: string) => ({ text });

  it("drops a long line repeated right after itself", () => {
    const out = dropRepeats([t("I can't leave work until after five."), t("I can't leave work until after five."), t("Sure.")]);
    expect(out.map((s) => s.text)).toEqual(["I can't leave work until after five.", "Sure."]);
  });

  it("keeps short replies that really do repeat", () => {
    expect(dropRepeats([t("Okay."), t("Okay."), t("Okay.")])).toHaveLength(3);
  });

  it("keeps a line said again much later in the call", () => {
    const line = "Is the best number the one you're calling from?";
    const between = ["One.", "Two.", "Three.", "Four.", "Five."].map(t);
    expect(dropRepeats([t(line), ...between, t(line)])).toHaveLength(7);
  });
});
