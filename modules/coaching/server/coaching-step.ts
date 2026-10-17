import "server-only";
import type { CallAnalysisStep } from "@/core/calls";
import type { CoachingFeedback } from "../model/types";

export const coachingStep: CallAnalysisStep<CoachingFeedback> = {
  moduleId: "coaching",
  async run() {
    // TODO: LLM call grounded in the call manual scripts for this call type.
    throw new Error("Coaching is not implemented yet.");
  },
};
