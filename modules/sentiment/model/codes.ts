import type { Speaker } from "@/core/calls";
import type { CallSentiment, Intensity, Sentiment } from "./types";

// The model answers with one short code per transcript line, to keep paid output small:
// line number, tone (p positive, n neutral, x negative), strength 1 to 3. "12x3" is line 12,
// negative, strong. Keeping the line number means a skipped line can't shift the rest.

const ENTRY = /^(\d+)([pnx])([123])$/;
const TONE = { p: "positive", n: "neutral", x: "negative" } as const satisfies Record<string, Sentiment>;

/**
 * Turns the model's codes into one label per turn. A line that was skipped or garbled counts as
 * neutral (cheaper than a retry), and neutral is always strength 1.
 */
export function parseSentimentCodes(
  codes: readonly string[],
  turns: readonly { start: number; end: number; speaker: Speaker }[],
): CallSentiment {
  const rated = new Map<number, { sentiment: Sentiment; strength: number }>();
  for (const code of codes) {
    const m = ENTRY.exec(code.trim());
    if (m) rated.set(Number(m[1]), { sentiment: TONE[m[2] as keyof typeof TONE], strength: Number(m[3]) });
  }
  return {
    version: 1,
    turns: turns.map((t, i) => {
      const label = rated.get(i);
      const sentiment = label?.sentiment ?? "neutral";
      const intensity = (sentiment === "neutral" ? 1 : label!.strength) as Intensity;
      return { start: t.start, end: t.end, speaker: t.speaker, sentiment, intensity };
    }),
  };
}
