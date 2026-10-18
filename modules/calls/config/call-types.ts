import { CALL_TYPE_GROUP_LABELS, DEFAULT_CALL_TYPES, type BuiltInCallType, type CallTypeGroup } from "@/core/calls";

// The built-in call types' names and groups. A company can rename them and add its own, so
// pages use the call's resolved `callTypeName` / `callTypeGroup` (from its catalog) instead.

export const CALL_TYPE_LABELS = Object.fromEntries(
  Object.entries(DEFAULT_CALL_TYPES).map(([key, t]) => [key, t.name]),
) as Record<BuiltInCallType, string>;

export type { CallTypeGroup };

export const CALL_TYPE_GROUP = Object.fromEntries(
  Object.entries(DEFAULT_CALL_TYPES).map(([key, t]) => [key, t.group]),
) as Record<BuiltInCallType, CallTypeGroup>;

export { CALL_TYPE_GROUP_LABELS };
