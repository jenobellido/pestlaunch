import { DEFAULT_SCORECARDS } from "@/core/calls";
import type { Scorecard } from "../model/types";

// The manuals' scorecards now live in core (core/calls/default-scorecards.ts), as the defaults
// every company starts with. Kept here for results saved before scorecards were per company.
export const SCORECARDS: Record<string, Scorecard> = DEFAULT_SCORECARDS;
