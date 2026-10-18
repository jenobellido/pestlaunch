import type { CallSentiment } from "./types";

/** Reads this module's result from a call's `analyses` map. Usable on the server and the client. */
export function getCallSentiment(analyses: Record<string, unknown>) {
  return analyses.sentiment as CallSentiment | null | undefined;
}
