import "server-only";
import { z } from "zod";
import { generateObject } from "@/core/ai";
import type { CallAnalysisStep, CallTypeDefinition, TranscriptSegment } from "@/core/calls";
import { unquote } from "../model/text";
import type { CoachingFeedback } from "../model/types";

const coachingSchema = z.object({
  strengths: z.array(z.string()).describe("1 to 3 specific things the employee did well, each one short sentence"),
  improvements: z
    .array(
      z.object({
        point: z.string().describe("What to improve, as a short instruction"),
        quote: z
          .string()
          .nullable()
          .describe("Exact words from the transcript, at most 25, where this happened; null if it was something missing"),
        suggestion: z.string().describe("What the employee could say instead next time, as a natural line of dialogue"),
      }),
    )
    .describe("1 to 3 improvements, most important first"),
  focus: z.string().describe("Exactly one behaviour to work on in the next call, one short sentence"),
});

// The call process from the PestLaunch call manuals, condensed. Coaching is judged against it.
const CALL_PROCESS = `The company's call process has four steps:
1. Validate: acknowledge the customer's specific situation with genuine empathy; a confidence statement ("I can definitely take care of this for you"); an expectation statement before asking questions ("I'm going to ask a few questions so I can...").
2. Understand: open-ended questions (who, what, when, where, why, how) to find the root cause and what the customer values; a summary statement repeating it back ("So you're looking for... does that sound right?"); an expectation statement before the solution.
3. Solve: present a solution tailored to them (what will be done, how, and why it matters for them); check for agreement ("Does that work for you?"); close (book it or confirm the change).
4. Verify: confirm details and next steps (date, time, notes for the technician); invite them to call for any other pest needs; genuinely thank them.`;

const CALL_TYPE_NOTES: Partial<Record<string, string>> = {
  new_customer: `Sales calls add: present the regular price first, then the sale price with the discount, then move straight to a close ("Which works better, Tuesday or Wednesday?"). Handle objections in four steps: agree with their point of view, restate the objection and suggest a reason, resolve it by building value, then re-close. Mention the referral program at the end.`,
  retention: `Retention calls differ: never agree up front to cancel; validate and say you'll take care of them, then look into the account (how long they've been a customer, contract, recent services). Ask just enough open-ended questions to find the real reason. Offer a solution matched to it (free re-service, back-to-back services, a set technician or time, a short pause, a waived payment, or a price drop only when price is the real issue) and ask how it sounds. If declined, ask more and offer another. Bring up a contract fee only after solutions fail, and stay on their side. If they still cancel, leave a teaser such as a free initial service if they come back. The customer having a great experience matters more than saving the account.`,
  reservice: `Re-service calls: validate the frustration of still seeing pests, find out where and what they're seeing, then explain what the technician will do on the return visit and why. With no cost involved, agreeing on the visit is the close.`,
};

const SYSTEM = `You are an experienced call coach for a pest control company. You write feedback for the employee on one call, which their manager will review with them.

${CALL_PROCESS}

Rules:
- Be specific to this call. Strengths must be things the employee clearly did in this transcript; never credit a step they skipped (e.g. don't praise thanking the customer unless they actually said thanks).
- Pick the improvements that would most change the outcome or the customer's experience.
- Quotes must be copied exactly from the transcript: the full phrase or sentence (5 to 25 words), not a fragment. Use null when the improvement is about something the employee never said.
- Suggestions are lines the employee could actually say on the phone, in a warm and natural tone, following the call process.
- Never use placeholders such as "$X" or "[price]", and never invent prices, discounts or programs: only use figures said in the call. If the call gave no figure, write the line without a number ("it's normally more, but this week...") or pick a different improvement. Don't suggest something the employee already did.
- A suggestion is always words the employee could say, never instructions about what to do.
- Never name the company or a person as spelled in the transcript, which often mishears names; say "our company" or "we".
- Don't credit a step the employee skipped: "we can help with that" is a confidence statement, not empathy.
- Keep it short and encouraging. No more than 3 strengths and 3 improvements.
- The speaker labels were added automatically and can occasionally be wrong; use the content to judge who said what.`;


/** Words only, so a quote matches the transcript despite punctuation and casing. */
const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9']+/g, " ").trim();

function transcriptText(segments: readonly TranscriptSegment[]) {
  const name = { employee: "Employee", customer: "Customer", unknown: "Other" } as const;
  return segments.map((s) => `${name[s.speaker]}: ${s.text}`).join("\n");
}

export async function coachCall(callType: CallTypeDefinition, transcript: readonly TranscriptSegment[]): Promise<CoachingFeedback> {
  // Built-in types have notes from the manuals; a company's own type is described in its words,
  // with its scorecard's steps as what good looks like.
  const steps = callType.scorecard?.sections.flatMap((s) => s.items.map((i) => `${i.name}: ${i.criteria}`));
  const notes = callType.builtIn
    ? CALL_TYPE_NOTES[callType.key]
    : [callType.description, steps?.length && `The company grades these calls on: ${steps.join("; ")}`].filter(Boolean).join(" ");
  const result = await generateObject({
    // In testing the fast model's coaching was as specific as the main one's, at about a third of the cost.
    tier: "fast",
    name: "call_coaching",
    schema: coachingSchema,
    system: SYSTEM,
    prompt: [
      `Call type: ${callType.name}`,
      notes && `For this call type: ${notes}`,
      `Transcript:\n${transcriptText(transcript)}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  // Keep a quote only if it's really in the transcript, so every quote shown can be trusted.
  // Feedback quotes the employee, so only their lines (or unlabelled ones) count.
  const transcriptWords = words(transcript.filter((s) => s.speaker !== "customer").map((s) => s.text).join(" "));
  const verified = (quote: string | null) => {
    const q = quote?.trim();
    return q && words(q) && transcriptWords.includes(words(q)) ? q : null;
  };

  return {
    strengths: result.strengths.map((s) => s.trim()).filter(Boolean).slice(0, 3),
    improvements: result.improvements
      .filter((p) => p.point.trim() && p.suggestion.trim())
      .slice(0, 3)
      .map((p) => ({ point: p.point.trim(), quote: verified(p.quote), suggestion: unquote(p.suggestion) })),
    focus: result.focus.trim(),
  };
}

export const coachingStep: CallAnalysisStep<CoachingFeedback | null> = {
  moduleId: "coaching",
  // Nothing to coach when the employee never speaks (a voicemail, a dropped call).
  run: ({ callTypeDef, transcript }) =>
    transcript.some((s) => s.speaker === "employee") ? coachCall(callTypeDef, transcript) : Promise.resolve(null),
};
