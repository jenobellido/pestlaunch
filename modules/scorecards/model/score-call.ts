import type { TranscriptSegment } from "@/core/calls";
import { gradeFor, maxPoints } from "./grade";
import type { Scorecard, ScorecardItemResult, ScorecardResult } from "./types";

/** What the grading model returns: a judgement per numbered item, in scorecard order. */
export interface ModelGrading {
  objectionsRaised: boolean;
  items: { item: number; passed: boolean; evidence: string | null; reason: string }[];
}

/** Words only, so a quote matches the transcript despite punctuation and casing. */
const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9']+/g, " ").trim();

/**
 * Turns the model's judgements into the call's result. The model only judges and quotes;
 * points and grade are computed here so the maths always matches the scorecard, and a
 * quote is kept only when it's really in the employee's words.
 */
export function scoreCall(
  card: Scorecard,
  graded: ModelGrading,
  transcript: readonly TranscriptSegment[],
): ScorecardResult {
  const byItem = new Map(graded.items.map((g) => [g.item, g]));
  // Points are for what the employee says, so a quote must come from their lines (or unlabelled
  // ones). A quote found only in the customer's lines doesn't count.
  const employeeWords = words(transcript.filter((s) => s.speaker !== "customer").map((s) => s.text).join(" "));
  const customerWords = words(transcript.filter((s) => s.speaker === "customer").map((s) => s.text).join(" "));
  let n = 0;

  const items: ScorecardItemResult[] = card.sections.flatMap((section) =>
    section.items.map((it) => {
      const g = byItem.get(n++);
      // Sales: no objections means the rep earns the whole objection section.
      if (section.autoAwardWhenNotApplicable && !graded.objectionsRaised) {
        return {
          section: section.title,
          item: it.name,
          passed: true,
          evidence: null,
          reason: "No objections were raised, so these points are awarded automatically.",
          autoAwarded: true,
        };
      }
      if (!g) {
        return { section: section.title, item: it.name, passed: false, evidence: null, reason: "Not assessed." };
      }
      // Keep a quote only if it's really in the transcript, so every quote shown can be trusted.
      const quote = g.evidence?.trim();
      const q = quote ? words(quote) : "";
      if (g.passed && q && !employeeWords.includes(q) && customerWords.includes(q)) {
        return {
          section: section.title,
          item: it.name,
          passed: false,
          evidence: null,
          reason: "Only the customer said this; the employee didn't.",
        };
      }
      const verified = q && employeeWords.includes(q) ? quote! : null;
      return { section: section.title, item: it.name, passed: g.passed, evidence: verified, reason: g.reason.trim() };
    }),
  );

  const points = items.filter((i) => i.passed).length;
  return { scorecardId: card.id, points, maxPoints: maxPoints(card), grade: gradeFor(card, points), items };
}
