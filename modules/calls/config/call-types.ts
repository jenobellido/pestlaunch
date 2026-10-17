import type { CallType } from "@/core/calls";

export const CALL_TYPE_LABELS: Record<CallType, string> = {
  new_customer: "New customer",
  scheduling: "Scheduling",
  billing: "Billing",
  reservice: "Re-service",
  retention: "Retention",
  other: "Other",
};

/** How PestLaunch groups calls in its Call Log and dashboards. */
export type CallTypeGroup = "sales" | "service" | "billing" | "retention" | "other";

export const CALL_TYPE_GROUP: Record<CallType, CallTypeGroup> = {
  new_customer: "sales",
  scheduling: "service",
  reservice: "service",
  billing: "billing",
  retention: "retention",
  other: "other",
};

export const CALL_TYPE_GROUP_LABELS: Record<CallTypeGroup, string> = {
  sales: "Sales",
  service: "Service",
  billing: "Billing",
  retention: "Retention",
  other: "Other",
};
