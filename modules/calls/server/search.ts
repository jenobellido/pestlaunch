import "server-only";
import { rankCalls, titleOf, type CallSearchHit } from "../lib/search";
import type { CallScope } from "./call-repository";
import { listCalls, searchTranscripts } from "./call-repository";
import { LEAD_STAGES, listLeads } from "./lead-repository";

export interface LeadSearchHit {
  id: string;
  callId: string;
  name: string;
  /** What they need and the stage, e.g. "Mice · Contacted". */
  meta: string;
}

const stageLabel = (stage: string) => LEAD_STAGES.find((s) => s.id === stage)?.label;

/**
 * The quick search (⌘K) over calls and leads the viewer may see. An empty query returns the
 * most recent calls, so the menu has something useful before anything is typed.
 */
export async function searchCallsAndLeads(
  tenant: string,
  query: string,
  scope: CallScope,
  limit = 6,
): Promise<{ calls: CallSearchHit[]; leads: LeadSearchHit[] }> {
  const q = query.trim();
  const [calls, transcriptHits, leads] = await Promise.all([
    listCalls(tenant, scope),
    q.length >= 2 ? searchTranscripts(tenant, q, scope) : Promise.resolve([]),
    q ? listLeads(tenant, scope) : Promise.resolve([]),
  ]);
  const lines = new Map(transcriptHits.map((m) => [m.callId, m.text]));
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const leadHits = leads
    .filter((l) => {
      const text = [l.customerName, l.need, l.callTitle].join(" ").toLowerCase();
      return terms.every((t) => text.includes(t));
    })
    .slice(0, limit)
    .map((l) => ({
      id: l.id,
      callId: l.callId,
      name: l.customerName ?? titleOf(l.callTitle),
      meta: [l.need, stageLabel(l.stage)].filter(Boolean).join(" · "),
    }));
  return { calls: rankCalls(calls, q, lines, limit), leads: leadHits };
}
