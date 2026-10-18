import type { CallRecord } from "../model/types";

/** A call found by the quick search (⌘K), ready to show. */
export interface CallSearchHit {
  id: string;
  title: string;
  /** Why it matched (the field or the transcript line), else the call's summary. */
  snippet: string;
  /** Call type and rep, e.g. "New customer · Sam". */
  meta: string;
  createdAt: string;
}

const RESOLUTION_WORDS: Record<string, string> = {
  booked: "booked",
  retained: "saved retained",
  cancelled: "cancelled canceled",
  resolved: "resolved",
  follow_up_needed: "follow-up follow up",
  unresolved: "unresolved",
};

/** The file name without its extension, e.g. "monday-call.mp3" → "monday-call". */
export function titleOf(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

const words = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);

function metaOf(call: CallRecord) {
  return [call.callTypeName, call.employeeName].filter(Boolean).join(" · ");
}

/**
 * How well a call matches the query, from what's shown about it (not the transcript): every
 * word must appear somewhere. Strong fields (title, rep, customer) count more than the summary.
 * Returns null when it doesn't match.
 */
export function matchCall(call: CallRecord, query: string): { score: number; snippet: string } | null {
  const terms = words(query);
  if (terms.length === 0) return null;
  const details = call.outcome?.details ?? [];
  const fields: { text: string; weight: number; snippet?: string }[] = [
    { text: titleOf(call.fileName), weight: 4 },
    { text: call.employeeName ?? "", weight: 3 },
    ...details.map((d) => ({
      text: d.value,
      weight: d.label === "Customer name" ? 4 : 2,
      snippet: `${d.label}: ${d.value}`,
    })),
    { text: call.callTypeName ?? "", weight: 2 },
    { text: call.outcome ? RESOLUTION_WORDS[call.outcome.resolution] : "", weight: 2 },
    { text: call.outcome?.summary ?? "", weight: 1 },
  ];
  const lower = fields.map((f) => f.text.toLowerCase());
  if (!terms.every((t) => lower.some((text) => text.includes(t)))) return null;

  let score = 0;
  let best: { weight: number; snippet?: string } | null = null;
  for (const [i, field] of fields.entries()) {
    const hits = terms.filter((t) => lower[i].includes(t)).length;
    if (hits === 0) continue;
    score += hits * field.weight;
    if (field.snippet && (!best || field.weight > best.weight)) best = field;
  }
  return { score, snippet: best?.snippet ?? call.outcome?.summary ?? "" };
}

/**
 * Ranks calls for the quick search. Calls that match on their details come first; calls that
 * only mention the words in the transcript follow, with the line that matched.
 */
export function rankCalls(
  calls: readonly CallRecord[],
  query: string,
  transcriptLines: ReadonlyMap<string, string>,
  limit: number,
): CallSearchHit[] {
  const hit = (call: CallRecord, snippet: string): CallSearchHit => ({
    id: call.id,
    title: titleOf(call.fileName),
    snippet,
    meta: metaOf(call),
    createdAt: call.createdAt,
  });
  if (words(query).length === 0) {
    return calls.slice(0, limit).map((c) => hit(c, c.outcome?.summary ?? ""));
  }
  const byFields = calls
    .map((call) => ({ call, match: matchCall(call, query) }))
    .filter((r) => r.match !== null)
    .sort((a, b) => b.match!.score - a.match!.score || b.call.createdAt.localeCompare(a.call.createdAt))
    .map((r) => hit(r.call, r.match!.snippet));
  const found = new Set(byFields.map((h) => h.id));
  const byTranscript = calls
    .filter((c) => !found.has(c.id) && transcriptLines.has(c.id))
    .map((c) => hit(c, `“${transcriptLines.get(c.id)}”`));
  return [...byFields, ...byTranscript].slice(0, limit);
}
