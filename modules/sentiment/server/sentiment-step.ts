import "server-only";
import { z } from "zod";
import { generateObject } from "@/core/ai";
import type { CallAnalysisStep, TranscriptSegment } from "@/core/calls";
import type { CallSentiment, Intensity, TurnSentiment } from "../model/types";

// Labels every transcript turn with the sentiment its words express. The model only labels;
// ranges, the mood curve, moments and the trend are computed in code (model/sentiment.ts).
// It reads the words, not the voice: tone, pace and volume aren't in the transcript.

const labels = z.object({
  lines: z.array(
    z.object({
      line: z.number().int().describe("The line number in brackets"),
      sentiment: z.enum(["positive", "neutral", "negative"]),
      intensity: z.number().int().min(1).max(3).describe("1 mild, 2 clear, 3 strong"),
    }),
  ),
});

const SYSTEM = `You rate the sentiment of each line in a phone call between a pest control company's employee and a customer.

For each numbered line, judge the feeling the speaker's own words express:
- negative: frustration, anger, worry, impatience, disappointment, threats to cancel, complaints about service.
- positive: gratitude, relief, warmth, enthusiasm, happy agreement, reassurance given with genuine care.
- neutral: routine information and logistics (names, addresses, dates, prices, questions and answers) with no clear feeling.

Rules:
- Describing a pest problem is not negative by itself ("I have ants in the kitchen" is neutral). It's negative when feeling shows ("they keep coming back and I'm fed up").
- Politeness alone ("thank you", "okay, great") is mildly positive (intensity 1), not strong.
- Rate the employee too: warm, empathetic lines are positive; curt or dismissive ones are negative.
- Recorded messages, phone menus and hold messages are neutral.
- Intensity: 1 mild, 2 clear, 3 strong. Neutral lines are always 1.
- Rate every numbered line in the "Rate these lines" section exactly once. Lines under "Just before" are context only.`;

/** Lines per request. Small enough to come back complete, large enough to keep requests few. */
const CHUNK = 60;
/** Lines shown before each chunk, so a feeling that started earlier is read in context. */
const CONTEXT = 4;

const name = { employee: "Employee", customer: "Customer", unknown: "Other" } as const;
const numbered = (segments: readonly TranscriptSegment[], from: number) =>
  segments.map((s, i) => `[${from + i}] ${name[s.speaker]}: ${s.text}`).join("\n");

async function rateChunk(transcript: readonly TranscriptSegment[], from: number) {
  const chunk = transcript.slice(from, from + CHUNK);
  const lineNumbers = chunk.map((_, i) => from + i);
  const context = from > 0 ? `Just before (context):\n${numbered(transcript.slice(Math.max(0, from - CONTEXT), from), Math.max(0, from - CONTEXT))}\n\n` : "";
  const result = await generateObject({
    name: "line_sentiment",
    schema: labels,
    system: SYSTEM,
    reasoningEffort: "low",
    prompt: `${context}Rate these lines (${from} to ${from + chunk.length - 1}):\n${numbered(chunk, from)}`,
    check: (data) => {
      const rated = new Set(data.lines.map((l) => l.line));
      const missing = lineNumbers.filter((n) => !rated.has(n));
      return missing.length > 0 ? `Rate every line; missing: ${missing.slice(0, 10).join(", ")}` : null;
    },
  });
  return new Map(result.lines.filter((l) => l.line >= from && l.line < from + chunk.length).map((l) => [l.line, l]));
}

export async function analyzeSentiment(transcript: readonly TranscriptSegment[]): Promise<CallSentiment> {
  const rated = new Map<number, { sentiment: TurnSentiment["sentiment"]; intensity: number }>();
  // Chunks one after another: the free AI tier allows few tokens per minute.
  for (let from = 0; from < transcript.length; from += CHUNK) {
    for (const [line, label] of await rateChunk(transcript, from)) rated.set(line, label);
  }
  return {
    version: 1,
    turns: transcript.map((s, i) => {
      const label = rated.get(i);
      const sentiment = label?.sentiment ?? "neutral";
      const intensity = (sentiment === "neutral" ? 1 : Math.min(3, Math.max(1, label?.intensity ?? 1))) as Intensity;
      return { start: s.start, end: s.end, speaker: s.speaker, sentiment, intensity };
    }),
  };
}

export const sentimentStep: CallAnalysisStep<CallSentiment | null> = {
  moduleId: "sentiment",
  // Nothing to read in a call with no conversation.
  run: ({ transcript }) => (transcript.length > 0 ? analyzeSentiment(transcript) : Promise.resolve(null)),
};
