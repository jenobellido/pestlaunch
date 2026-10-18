// The first-run checklist on the Overview: the few things a new company does to get value
// from PestLaunch. Each step is ticked off by what's actually in the workspace, never by a
// click, so it can't drift from reality.

export type SetupStepId = "upload" | "invite" | "review" | "assign";

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  /** The button that takes you there. */
  action: { label: string; href: string };
  done: boolean;
}

export interface SetupInput {
  slug: string;
  /** What the viewer is allowed to do; steps they can't do aren't shown. */
  can: { upload: boolean; invite: boolean; review: boolean; assign: boolean };
  callCount: number;
  /** Members plus open invites, including the viewer. */
  teamSize: number;
  reviewedCount: number;
  taskCount: number;
}

export function setupSteps(input: SetupInput): SetupStep[] {
  const { slug, can } = input;
  const steps: (SetupStep | false)[] = [
    can.upload && {
      id: "upload",
      title: "Upload your first call",
      description: "Drop in a recording. You'll get the transcript, outcome, score and coaching in a few minutes.",
      action: { label: "Upload", href: `/${slug}/calls` },
      done: input.callCount > 0,
    },
    can.invite && {
      id: "invite",
      title: "Invite your team",
      description: "Reps see their own calls and coaching; managers see everyone's.",
      action: { label: "Invite", href: `/${slug}/settings/members` },
      done: input.teamSize > 1,
    },
    can.review && {
      id: "review",
      title: "Check a call's score",
      description: "Open a call, read the grading and fix anything the AI got wrong. Your changes are kept.",
      action: { label: "Open calls", href: `/${slug}/calls` },
      done: input.reviewedCount > 0,
    },
    can.assign && {
      id: "assign",
      title: "Assign a follow-up",
      description: "Give a leak an owner on Follow-ups, so it doesn't fall through the cracks.",
      // Leaks only exist once there are calls; before that, start at the calls page.
      action: input.callCount > 0 ? { label: "Follow-ups", href: `/${slug}/follow-ups` } : { label: "Open calls", href: `/${slug}/calls` },
      done: input.taskCount > 0,
    },
  ];
  return steps.filter((s): s is SetupStep => s !== false);
}

/** Show the checklist only to people with real setup to do, until it's done or hidden. */
export function showSetup(steps: readonly SetupStep[], hidden: boolean) {
  return !hidden && steps.length >= 2 && steps.some((s) => !s.done);
}

/** The cookie that hides the checklist for this browser in this company. */
export const setupCookieName = (tenantId: string) => `pl-setup-hidden-${tenantId}`;
