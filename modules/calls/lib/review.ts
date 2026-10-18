import type { TranscriptSegment } from "@/core/calls";

/**
 * Reasons a person should check a call's AI results before trusting them. Based on the
 * transcript and attribution only; the scorecards module adds grade-based reasons.
 */
export function callReviewFlags(call: {
  status: string;
  employeeId: string | null;
  heardEmployeeName: string | null;
  transcript?: readonly TranscriptSegment[];
}): string[] {
  if (call.status !== "ready") return [];
  const flags: string[] = [];
  if (!call.employeeId && !call.heardEmployeeName) flags.push("No rep was identified on the call.");

  const transcript = call.transcript ?? [];
  const words = { employee: 0, customer: 0, unknown: 0 };
  for (const s of transcript) words[s.speaker] += s.text.split(/\s+/).filter(Boolean).length;
  const total = words.employee + words.customer + words.unknown;
  // Speaker labels come from a model reading the text; lopsided splits usually mean mislabels.
  if (total >= 40) {
    if (words.unknown / total > 0.25) flags.push("Much of the call couldn't be put to a speaker.");
    else if (words.employee / total < 0.15 || words.customer / total < 0.1) {
      flags.push("The speaker labels look lopsided; check who said what.");
    }
  }
  return flags;
}
