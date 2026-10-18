import { z } from "zod";
import { CALL_TYPE_GROUPS, type CallTypeDefinition, type CallTypeOverride } from "@/core/calls";

// What the call type editor sends, checked on the server before it's saved. Kept pure so it can
// be unit tested. Limits keep a scorecard something a person (and the grader) can work with.

const step = z.object({
  name: z.string().trim().min(1, "Every step needs a name.").max(60, "Keep step names under 60 characters."),
  criteria: z
    .string()
    .trim()
    .min(5, "Say what the rep has to do to pass each step.")
    .max(400, "Keep each step's description under 400 characters."),
});

const section = z.object({
  title: z.string().trim().min(1, "Every section needs a title.").max(40),
  autoAward: z.boolean(),
  items: z.array(step).min(1, "Every section needs at least one step.").max(12),
});

export const callTypeInput = z
  .object({
    name: z.string().trim().min(2, "Give the call type a name.").max(40, "Keep the name under 40 characters."),
    description: z
      .string()
      .trim()
      .min(10, "Describe how to recognise this kind of call; the AI sorts calls by it.")
      .max(600, "Keep the description under 600 characters."),
    group: z.enum(CALL_TYPE_GROUPS),
    enabled: z.boolean(),
    scored: z.boolean(),
    scorecardName: z.string().trim().max(60),
    sections: z.array(section).max(10),
    gold: z.number().int().min(1),
    green: z.number().int().min(1),
  })
  .superRefine((input, ctx) => {
    if (!input.scored) return;
    const max = input.sections.reduce((n, s) => n + s.items.length, 0);
    if (max === 0) ctx.addIssue({ code: "custom", message: "Add at least one step, or turn scoring off.", path: ["sections"] });
    if (input.gold > max) ctx.addIssue({ code: "custom", message: `Gold can be at most ${max}, the number of steps.`, path: ["gold"] });
    if (input.green > input.gold) ctx.addIssue({ code: "custom", message: "Green can't be higher than Gold.", path: ["green"] });
  });

export type CallTypeInput = z.infer<typeof callTypeInput>;

/** What gets saved. An edited or new scorecard is keyed by its call type, so it never mixes with a shared default. */
export function toOverride(key: string, input: CallTypeInput): CallTypeOverride {
  return {
    key,
    name: input.name,
    description: input.description,
    group: input.group,
    enabled: input.enabled,
    scorecard: input.scored
      ? {
          id: key,
          name: input.scorecardName || `${input.name} calls`,
          thresholds: { gold: input.gold, green: input.green },
          sections: input.sections.map((s) => ({
            title: s.title,
            items: s.items,
            ...(s.autoAward ? { autoAwardWhenNotApplicable: true } : {}),
          })),
        }
      : null,
  };
}

/** The editor's starting values for an existing type. */
export function toInput(type: CallTypeDefinition): CallTypeInput {
  const card = type.scorecard;
  const steps = card?.sections.reduce((n, s) => n + s.items.length, 0) ?? 0;
  return {
    name: type.name,
    description: type.description,
    group: type.group,
    enabled: type.enabled,
    scored: !!card,
    scorecardName: card?.name ?? "",
    sections:
      card?.sections.map((s) => ({
        title: s.title,
        autoAward: !!s.autoAwardWhenNotApplicable,
        items: s.items.map((i) => ({ name: i.name, criteria: i.criteria })),
      })) ?? [],
    gold: card?.thresholds.gold ?? Math.max(steps, 1),
    green: card?.thresholds.green ?? Math.max(steps - 1, 1),
  };
}

/** A blank type for "New call type": the manuals' four steps, ready to fill in. */
export function blankInput(): CallTypeInput {
  const section = (title: string) => ({ title, autoAward: false, items: [{ name: "", criteria: "" }] });
  return {
    name: "",
    description: "",
    group: "service",
    enabled: true,
    scored: true,
    scorecardName: "",
    sections: ["Validate", "Understand", "Solve", "Verify"].map(section),
    gold: 4,
    green: 3,
  };
}
