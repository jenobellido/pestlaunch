import "server-only";
import { z } from "zod";
import { generateObject } from "@/core/ai";
import { CALL_TYPE_GROUPS, DEFAULT_SCORECARDS, type CallTypeDefinition } from "@/core/calls";
import type { CallTypeInput } from "./input";

// The setup assistant: turns a plain description of a kind of call (or a pasted part of a call
// manual) into a call type with a scorecard, which the person then reviews and edits. It only
// drafts; nothing is saved until they press Save.

const draftSchema = z.object({
  name: z.string().describe("Short name for the call type, 1 to 3 words, e.g. \"Commercial quote\""),
  description: z
    .string()
    .describe("How to recognise this kind of call from its transcript, 1 to 2 sentences, written for the AI that sorts calls"),
  group: z.enum(CALL_TYPE_GROUPS).describe("Which dashboard group it belongs to"),
  scored: z.boolean().describe("Whether calls of this type should be graded"),
  scorecardName: z.string().describe("Name of its scorecard, e.g. \"Commercial Quote Calls\""),
  sections: z
    .array(
      z.object({
        title: z.string(),
        autoAward: z.boolean().describe("True only for an objection-handling section awarded automatically when no objections come up"),
        items: z.array(z.object({ name: z.string(), criteria: z.string() })),
      }),
    )
    .describe("Scorecard sections in call order; empty when not scored"),
  gold: z.number().int().describe("Points needed for Gold: usually every step"),
  green: z.number().int().describe("Points needed for Green: usually one or two fewer than Gold"),
});

const example = DEFAULT_SCORECARDS.all_calls.sections
  .map((s) => `${s.title}: ${s.items.map((i) => `${i.name} (${i.criteria})`).join("; ")}`)
  .join("\n");

const SYSTEM = `You help a pest control company set up a new kind of call in PestLaunch, which records phone calls, sorts them by type and grades each against its type's scorecard.

From what the person describes (or a part of their call manual they paste), draft:
- a short name and a description that says how to recognise this kind of call from what's said in it;
- the dashboard group: sales (winning new business), service (appointments and visits), billing (payments), retention (cancellations), other;
- a scorecard: sections in the order the call happens, each with steps a rep either does or doesn't. Each step has a short name and one sentence saying exactly what the rep must do to pass, so a grader can judge it from the transcript. Aim for 8 to 14 steps.

Follow the company's call process unless the person says otherwise. Its standard scorecard for office calls is:
${example}

Keep the four steps (Validate, Understand, Solve, Verify) and adapt the steps to this kind of call. Use the person's own words and steps when they give them. Gold is usually every step; Green one or two fewer. Only make a type unscored if the person says these calls shouldn't be graded (e.g. vendor calls).`;

export async function draftCallType(brief: string, existing: readonly CallTypeDefinition[]): Promise<CallTypeInput> {
  const draft = await generateObject({
    name: "call_type_draft",
    schema: draftSchema,
    system: SYSTEM,
    reasoningEffort: "low",
    prompt: `The company already has these call types, so don't duplicate one: ${existing.map((t) => t.name).join(", ")}.\n\nWhat the person wants:\n${brief}`,
    check: (d) => {
      const steps = d.sections.reduce((n, s) => n + s.items.length, 0);
      if (d.scored && steps === 0) return "a scored type needs steps";
      return null;
    },
  });
  const steps = draft.sections.reduce((n, s) => n + s.items.length, 0);
  // The editor validates everything on save; just keep the grade lines sensible here.
  const gold = Math.min(Math.max(draft.gold, 1), Math.max(steps, 1));
  return {
    name: draft.name.trim().slice(0, 40),
    description: draft.description.trim().slice(0, 600),
    group: draft.group,
    enabled: true,
    scored: draft.scored,
    scorecardName: draft.scorecardName.trim().slice(0, 60),
    sections: draft.sections.map((s) => ({
      title: s.title.trim().slice(0, 40),
      autoAward: s.autoAward,
      items: s.items.map((i) => ({ name: i.name.trim().slice(0, 60), criteria: i.criteria.trim().slice(0, 400) })),
    })),
    gold,
    green: Math.min(Math.max(draft.green, 1), gold),
  };
}
