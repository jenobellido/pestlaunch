import "server-only";
import { z } from "zod";
import { generateObject } from "@/core/ai";
import type { CallAnalysisStep, TranscriptSegment } from "@/core/calls";
import { SCORECARDS } from "../config/scorecards";
import { scorecardFor } from "../model/grade";
import { scoreCall } from "../model/score-call";
import type { Scorecard, ScorecardResult } from "../model/types";

// The model only judges each item and quotes its evidence. Points, grade and quote checks
// are computed by scoreCall (model/score-call.ts), so the maths always matches the scorecard.

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

  return scoreCall(card, graded, transcript);
}

export const scoringStep: CallAnalysisStep<ScorecardResult | null> = {
  moduleId: "scorecards",
  async run({ callType, transcript }) {
    const id = scorecardFor(callType);
    return id ? gradeCall(SCORECARDS[id], transcript) : null;
  },
};
