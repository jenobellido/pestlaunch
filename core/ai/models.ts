// Which chat models a request tries, in order. Pure, so it's unit tested without the network.

/**
 * "best" is for the results the product is judged on (scoring, call analysis). "fast" is for
 * simpler, high-volume jobs (speaker labels, coaching, sentiment), where a smaller model matched
 * the main one in testing at a fraction of the cost.
 */
export type ModelTier = "best" | "fast";

export interface ChatModelConfig {
  /** AI_CHAT_MODEL */
  main: string;
  /** AI_CHAT_FALLBACK_MODEL: used when the main model is unavailable. Empty turns it off. */
  fallback: string;
  /** AI_CHAT_FAST_MODEL: the "fast" tier. Empty means "fast" uses the main model. */
  fast: string;
}

/**
 * The models to try for a tier, best first: "fast" starts with the fast model and falls back to
 * the main and fallback models, so a fast model that's unavailable never fails a call. Models
 * still inside a known usage limit (`limitedUntil`, epoch ms) move to the end.
 */
export function modelOrder(
  tier: ModelTier,
  config: ChatModelConfig,
  limitedUntil: ReadonlyMap<string, number> = new Map(),
  now = Date.now(),
): string[] {
  const wanted = tier === "fast" ? [config.fast, config.main, config.fallback] : [config.main, config.fallback];
  const all = wanted.map((m) => m.trim()).filter((m, i, list) => m !== "" && list.indexOf(m) === i);
  const available = (m: string) => (limitedUntil.get(m) ?? 0) <= now;
  return [...all.filter(available), ...all.filter((m) => !available(m))];
}
