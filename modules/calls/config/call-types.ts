import type { CallType } from "@/core/calls";

export const CALL_TYPE_LABELS: Record<CallType, string> = {
  new_customer: "New customer",
  scheduling: "Scheduling",
  billing: "Billing",
  reservice: "Re-service",
  retention: "Retention",
  other: "Other",
};
