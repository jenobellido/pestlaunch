import "server-only";
import { z } from "zod";
import { generateObject } from "@/core/ai";
import type { CallAnalysisStep, TranscriptSegment } from "@/core/calls";
import { parseSentimentCodes } from "../model/codes";
import type { CallSentiment } from "../model/types";

// Labels every transcript turn with the sentiment its words express, in ONE low-effort request
// per call with a compact answer, to keep AI spend low. The model only labels; ranges, the mood
// curve, moments and the trend are computed in code (model/sentiment.ts), which costs nothing.
// It reads the words, not the voice: tone, pace and volume aren't in the transcript.

/** Calls with fewer turns than this (a voicemail, a wrong number) aren't worth a request. */
export const MIN_TURNS = 4;

// The answer is one tiny code per line (see model/codes.ts): output tokens cost the most.
const labels = z.object({
  r: z.array(z.string()).describe('One code per line, in order: line number, tone (p, n or x), strength (1-3). E.g. "0n1", "1x3"'),
});

const SYSTEM = `You rate the sentiment of each line in a phone call between a pest control company's employee (E) and a customer (C).

For each numbered line, judge the feeling the speaker's own words express:
- x (negative): frustration, anger, worry, impatience, disappointment, wanting to cancel, complaints about service.
- p (positive): gratitude, relief, warmth, enthusiasm, happy agreement, reassurance given with genuine care.
- n (neutral): routine information and logistics (names, addresses, dates, prices, questions, answers) with no clear feeling.

Rules:
- Describing a pest problem isn't negative by itself ("I have ants in the kitchen" is n). It is when feeling shows ("they keep coming back and I'm fed up").
- Politeness alone ("thank you", "okay, great") is p with strength 1.
- Rate the employee too: warm, empathetic lines are p; curt or dismissive ones are x.
- Recorded messages, phone menus and hold messages (O) are n.
- Strength: 1 mild, 2 clear, 3 strong. Neutral is always 1.
- Answer with one code per line, in order: the line number, the tone letter and the strength, e.g. "0n1", "1x3", "2p2". Rate every line exactly once.`;

const who = { employee: "E", customer: "C", unknown: "O" } as const;

export async function analyzeSentiment(transcript: readonly TranscriptSegment[]): Promise<CallSentiment> {
  const result = await generateObject({
    name: "line_sentiment",
    schema: labels,
    system: SYSTEM,
    reasoningEffort: "low",
    prompt: transcript.map((s, i) => `${i} ${who[s.speaker]}: ${s.text}`).join("\n"),
  });
  return parseSentimentCodes(result.r, transcript);
}

export const sentimentStep: CallAnalysisStep<CallSentiment | null> = {
  moduleId: "sentiment",
  run: ({ transcript }) => (transcript.length >= MIN_TURNS ? analyzeSentiment(transcript) : Promise.resolve(null)),
};
