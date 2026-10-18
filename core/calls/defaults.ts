import { DEFAULT_SCORECARDS } from "./default-scorecards";
import type { BuiltInCallType, CallTypeDefinition } from "./types";

// The call types every company starts with. Definitions follow the PestLaunch office and sales
// call manuals; the AI classifies calls by the descriptions, so they say what to look for.

type Default = Omit<CallTypeDefinition, "key" | "enabled" | "builtIn" | "customized">;

export const DEFAULT_CALL_TYPES: Record<BuiltInCallType, Default> = {
  new_customer: {
    name: "New customer",
    description:
      "Someone who isn't a customer yet asks about service: a quote, an inspection or signing up. Inbound sales.",
    group: "sales",
    scorecard: DEFAULT_SCORECARDS.sales,
  },
  scheduling: {
    name: "Scheduling",
    description:
      "Setting, moving or asking about a service appointment (including whether a visit's work was finished or when the technician comes back), or special needs for an upcoming visit. Includes a new customer whose sale was already agreed (e.g. by email or a web form) when the call only arranges the timing or payment.",
    group: "service",
    scorecard: DEFAULT_SCORECARDS.all_calls,
  },
  billing: {
    name: "Billing",
    description: "Invoices, payments, charges, balances, declined cards, updating the card on file.",
    group: "billing",
    scorecard: DEFAULT_SCORECARDS.all_calls,
  },
  reservice: {
    name: "Re-service",
    description: "An existing customer still has pests after a treatment and needs a technician to come back.",
    group: "service",
    scorecard: DEFAULT_SCORECARDS.all_calls,
  },
  retention: {
    name: "Retention",
    description:
      "The customer wants to cancel or stop service, including when the company calls back about a cancel request.",
    group: "retention",
    scorecard: DEFAULT_SCORECARDS.retention,
  },
  other: {
    name: "Other",
    description:
      "Anything else, e.g. changing service address, technician feedback, vendors, wrong numbers, or a voicemail.",
    group: "other",
    scorecard: null,
  },
};

export function defaultCallType(key: BuiltInCallType): CallTypeDefinition {
  return { key, ...DEFAULT_CALL_TYPES[key], enabled: true, builtIn: true, customized: false };
}
