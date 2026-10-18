import "server-only";
import { z } from "zod";
import { generateObject } from "@/core/ai";
import type { CallAnalysisStep, CallType, TranscriptSegment } from "@/core/calls";
import { SCORECARDS } from "../config/scorecards";
import { maxPoints, scorecardFor } from "../model/grade";
import { scoreCall } from "../model/score-call";
import type { Scorecard, ScorecardResult } from "../model/types";

// The model only judges each item and quotes its evidence. Points, grade and quote checks
// are computed by scoreCall (model/score-call.ts), so the maths always matches the scorecard.

const gradingSchema = z.object({
  objectionsRaised: z
    .boolean()
    .describe(
      "True if the customer pushed back on buying: price, needing to ask a spouse, comparing other companies, or doubting they need it. A clash over appointment times or a question about how to pay isn't an objection",
    ),
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
- One quote earns two items only if it clearly does both. "We can help with that" is a confidence statement, not validation: validation voices empathy for the customer's specific situation.
- Agreeing with an objection needs the employee to say they understand the customer's view; "yeah" or repeating the objection isn't agreement.
- A conclusion recaps the agreed date, time or next step near the end of the call; the line that first offered the time doesn't count.
- Grade every numbered item exactly once.
- The speaker labels were added automatically and can occasionally be wrong; use the content to judge who said what.`;

// The office manual's lighter version of the steps for short scheduling and billing calls.
const LIGHT_CALL_NOTE = `This is a short scheduling or billing call, and the manual's lighter version of the steps applies: stating the change made or the new appointment is Present Solution; "let me check the schedule" is an Expectation Statement; a short confirm-back ("so after 12 works?") is a Summary Statement; the Understand steps may be brief. Investigate still needs a question about the customer's situation or need: not the greeting ("How can I help?") and not offering a time slot. A Summary Statement repeats back something the customer said (their availability, request or concern); offering our slot is Present Solution, not a Summary.`;

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

export async function gradeCall(
  card: Scorecard,
  transcript: readonly TranscriptSegment[],
  callType?: CallType,
): Promise<ScorecardResult> {
  const itemCount = maxPoints(card);
  const graded = await generateObject({
    name: "scorecard_grading",
    schema: gradingSchema,
    system: SYSTEM,
    // A skipped item would otherwise count as missed, so an incomplete grading is retried.
    check: ({ items }) => {
      const seen = new Set(items.map((i) => i.item));
      const missing = Array.from({ length: itemCount }, (_, n) => n).filter((n) => !seen.has(n));
      return missing.length ? `items ${missing.join(", ")} weren't graded` : null;
    },
    prompt: [
      `Scorecard: ${card.name}\n${itemList(card)}`,
      (callType === "scheduling" || callType === "billing") && LIGHT_CALL_NOTE,
      `Transcript:\n${transcriptText(transcript)}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  return scoreCall(card, graded, transcript);
}

export const scoringStep: CallAnalysisStep<ScorecardResult | null> = {
  moduleId: "scorecards",
  async run({ callType, transcript }) {
    const id = scorecardFor(callType);
    return id ? gradeCall(SCORECARDS[id], transcript, callType) : null;
  },
};
