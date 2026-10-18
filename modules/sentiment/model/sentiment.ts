import type { Sentiment, TurnSentiment } from "./types";

// Pure logic over a call's per-turn sentiment: the parts of the recording by sentiment, the
// customer's mood over time, the moments it changed, and how the call ended up.

/** A turn as a number from -1 (strongly negative) to 1 (strongly positive). */
export function turnScore(turn: Pick<TurnSentiment, "sentiment" | "intensity">) {
  if (turn.sentiment === "neutral") return 0;
  return (turn.sentiment === "positive" ? 1 : -1) * (turn.intensity / 3);
}

/** A stretch of the recording with one sentiment. */
export interface SentimentRange {
  start: number;
  end: number;
  sentiment: Sentiment;
}

/**
 * Splits the recording into ranges of one sentiment: consecutive turns with the same sentiment
 * merge, whoever is speaking. Silence between turns joins the range before it.
 */
export function sentimentRanges(turns: readonly TurnSentiment[]): SentimentRange[] {
  const ranges: SentimentRange[] = [];
  for (const turn of [...turns].sort((a, b) => a.start - b.start)) {
    const last = ranges.at(-1);
    if (last && last.sentiment === turn.sentiment) last.end = Math.max(last.end, turn.end);
    else {
      if (last) last.end = Math.max(last.end, turn.start);
      ranges.push({ start: turn.start, end: turn.end, sentiment: turn.sentiment });
    }
  }
  return ranges;
}

/** Share of talk time with each sentiment, 0 to 1. Only time someone is speaking counts. */
export function sentimentShares(turns: readonly TurnSentiment[]): Record<Sentiment, number> {
  const time = { positive: 0, neutral: 0, negative: 0 };
  for (const t of turns) time[t.sentiment] += Math.max(0, t.end - t.start);
  const total = time.positive + time.neutral + time.negative;
  if (total === 0) return { positive: 0, neutral: 0, negative: 0 };
  return { positive: time.positive / total, neutral: time.neutral / total, negative: time.negative / total };
}

export interface MoodPoint {
  /** Seconds into the call (the turn's start). */
  at: number;
  /** Smoothed mood, -1 to 1. */
  mood: number;
  /** The turn this point comes from. */
  turn: TurnSentiment;
}

/**
 * The customer's mood through the call: each customer turn's score, smoothed with the turns
 * before it so one line doesn't swing the curve. `weight` is how much a new turn counts.
 */
export function customerMood(turns: readonly TurnSentiment[], weight = 0.5): MoodPoint[] {
  const points: MoodPoint[] = [];
  let mood: number | null = null;
  for (const turn of [...turns].sort((a, b) => a.start - b.start)) {
    if (turn.speaker !== "customer") continue;
    const score = turnScore(turn);
    mood = mood === null ? score : mood + (score - mood) * weight;
    points.push({ at: turn.start, mood, turn });
  }
  return points;
}

/** Mood above this reads as positive, below its negative as negative. */
export const MOOD_THRESHOLD = 0.25;

export function moodSentiment(mood: number): Sentiment {
  if (mood >= MOOD_THRESHOLD) return "positive";
  if (mood <= -MOOD_THRESHOLD) return "negative";
  return "neutral";
}

export type MomentKind = "turned_negative" | "recovered" | "turned_positive";

export interface SentimentMoment {
  kind: MomentKind;
  at: number;
  /** The customer turn where it happened; its words are the evidence. */
  turn: TurnSentiment;
}

/**
 * Where the customer's mood changed category: they became upset, recovered from being upset,
 * or became positive. A customer starts from neutral, so one who opens the call upset counts
 * as becoming upset. Returned in call order, at most `limit`.
 */
export function moodMoments(turns: readonly TurnSentiment[], limit = 4): SentimentMoment[] {
  const moments: SentimentMoment[] = [];
  let previous: Sentiment = "neutral";
  for (const point of customerMood(turns)) {
    const now = moodSentiment(point.mood);
    if (now !== previous) {
      const kind: MomentKind | null =
        now === "negative" ? "turned_negative" : previous === "negative" ? "recovered" : now === "positive" ? "turned_positive" : null;
      if (kind) moments.push({ kind, at: point.at, turn: point.turn });
    }
    previous = now;
  }
  return moments.slice(0, limit);
}

export type MoodTrend = "improved" | "worsened" | "steady";

export interface MoodSummary {
  start: Sentiment;
  end: Sentiment;
  trend: MoodTrend;
}

/**
 * How the customer felt at the start of the call compared with the end: the average of their
 * first and last third of turns. Null when the customer barely spoke.
 */
export function moodSummary(turns: readonly TurnSentiment[]): MoodSummary | null {
  const scores = [...turns]
    .sort((a, b) => a.start - b.start)
    .filter((t) => t.speaker === "customer")
    .map(turnScore);
  if (scores.length < 2) return null;
  const third = Math.max(1, Math.floor(scores.length / 3));
  const average = (values: number[]) => values.reduce((n, v) => n + v, 0) / values.length;
  const start = average(scores.slice(0, third));
  const end = average(scores.slice(-third));
  const change = end - start;
  return {
    start: moodSentiment(start),
    end: moodSentiment(end),
    trend: change >= 0.3 ? "improved" : change <= -0.3 ? "worsened" : "steady",
  };
}
