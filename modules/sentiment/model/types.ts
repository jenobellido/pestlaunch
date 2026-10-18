import type { Speaker } from "@/core/calls";

export type Sentiment = "positive" | "neutral" | "negative";

/** How strongly a sentiment comes through: 1 mild, 2 clear, 3 strong. */
export type Intensity = 1 | 2 | 3;

/** One transcript turn with the sentiment its words express. */
export interface TurnSentiment {
  start: number;
  end: number;
  speaker: Speaker;
  sentiment: Sentiment;
  intensity: Intensity;
}

/**
 * What the analysis step stores per call (`analyses.sentiment`). Only the per-turn labels are
 * kept; ranges, the mood curve, moments and the trend are derived in code when shown, so
 * improving that logic applies to calls already analysed.
 */
export interface CallSentiment {
  version: 1;
  turns: TurnSentiment[];
}
