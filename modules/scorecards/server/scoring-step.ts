import "server-only";
import { z } from "zod";
import { generateObject } from "@/core/ai";
import type { CallAnalysisStep, TranscriptSegment } from "@/core/calls";
import { SCORECARDS } from "../config/scorecards";
import { gradeFor, maxPoints, scorecardFor } from "../model/grade";
import type { Scorecard, ScorecardItemResult, ScorecardResult } from "../model/types";

// The model only judges each item and quotes its evidence. Points and grade are
// computed here, so the maths is always consistent with the scorecard.

const gradingSchema = z.object({
  objectionsRaised: z
    .boolean()
    .describe("True if the customer raised any objection or hesitation about buying (price, timing, spouse, other companies)"),
  items: z.array(
    z.object({
      item: z.number().int().describe("The item number in brackets"),
      passed: z.boolean(),
      evidence: z
        .string()
        .nullable()
        .describe("Exact words from the transcript, at most 25, that show the item was done; null if it wasn't"),
      reason: z.string().describe("One short sentence: what the employee did, or what was missing"),
    }),
  ),
});

const SYSTEM = `You grade pest control phone calls against the company's call scorecard, for the manager who coaches the employee.

How to grade:
- Judge only what the employee says. Each item passes only if the call clearly shows the behaviour in its criteria; the exact wording doesn't matter, the intent does.
- Be strict but fair. A passing evidence quote must be copied exactly from the transcript and must be the employee's own words, never the customer's (e.g. the customer saying "thank you" doesn't mean the employee thanked them). If you can't quote the employee, it didn't pass.
- An item that doesn't fit the call can still be judged on its intent (e.g. with no cost, agreeing to the plan is the close).
- Grade every numbered item exactly once.
- The speaker labels were added automatically and can occasionally be wrong; use the content to judge who said what.`;

/** Words only, so a quote matches the transcript despite punctuation and casing. */
const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9']+/g, " ").trim();

function transcriptText(segments: readonly TranscriptSegment[]) {
  const name = { employee: "Employee", customer: "Customer", unknown: "Other" } as const;
  return segments.map((s) => `${name[s.speaker]}: ${s.text}`).join("\n");
}

function itemList(card: Scorecard) {
  let n = 0;
  return card.sections
    .flatMap((s) => s.items.map((i) => `[${n++}] ${s.title} / ${i.name}: ${i.criteria}`))
    .join("\n");
}

export async function gradeCall(card: Scorecard, transcript: readonly TranscriptSegment[]): Promise<ScorecardResult> {
  const graded = await generateObject({
    name: "scorecard_grading",
    schema: gradingSchema,
    system: SYSTEM,
    prompt: `Scorecard: ${card.name}\n${itemList(card)}\n\nTranscript:\n${transcriptText(transcript)}`,
  });

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

export const scoringStep: CallAnalysisStep<ScorecardResult | null> = {
  moduleId: "scorecards",
  async run({ callType, transcript }) {
    const id = scorecardFor(callType);
    return id ? gradeCall(SCORECARDS[id], transcript) : null;
  },
};
