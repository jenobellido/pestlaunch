import "server-only";
import { rankCalls, type CallSearchHit } from "../lib/search";
import type { CallScope } from "./call-repository";
import { listCalls, searchTranscripts } from "./call-repository";

/**
 * The quick search (⌘K) over the calls the viewer may see: by their details (title, rep,
 * customer, pest, type, outcome) and what was said. An empty query returns the most recent
 * calls, so the menu has something useful before anything is typed.
 */
export async function searchCalls(tenant: string, query: string, scope: CallScope, limit = 6): Promise<CallSearchHit[]> {
  const q = query.trim();
  const [calls, transcriptHits] = await Promise.all([
    listCalls(tenant, scope),
    q.length >= 2 ? searchTranscripts(tenant, q, scope) : Promise.resolve([]),
  ]);
  const lines = new Map(transcriptHits.map((m) => [m.callId, m.text]));
  return rankCalls(calls, q, lines, limit);
}
