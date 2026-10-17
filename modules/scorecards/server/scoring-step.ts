import "server-only";
import type { CallAnalysisStep } from "@/core/calls";
import { SCORECARDS } from "../config/scorecards";
import { scorecardFor } from "../model/grade";
import type { ScorecardResult } from "../model/types";

export const scoringStep: CallAnalysisStep<ScorecardResult | null> = {
  moduleId: "scorecards",
  async run({ callType }) {
    const id = scorecardFor(callType);
    if (!id) return null;
    const _card = SCORECARDS[id];
    // TODO: ask the LLM for a pass/fail + evidence quote per item, then compute
    // points and grade here with maxPoints/gradeFor so the math is deterministic.
    throw new Error("Scoring is not implemented yet.");
  },
};
