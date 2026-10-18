import { defaultCallType } from "./defaults";
import {
  BUILT_IN_CALL_TYPES,
  CALL_TYPE_GROUPS,
  type BuiltInCallType,
  type CallType,
  type CallTypeDefinition,
  type CallTypeGroup,
  type ScorecardDefinition,
} from "./types";

// A company's call types: the built-in defaults, with the company's changes laid over them,
// then the types it created. Kept pure so the merge can be unit tested; the database side
// is catalog-repository.ts.

/** A company's saved version of a call type (an edited built-in, or one of its own). */
export interface CallTypeOverride {
  key: CallType;
  name: string;
  description: string;
  group: string;
  scorecard: ScorecardDefinition | null;
  enabled: boolean;
}

/** How a call's type is decided: by the AI, or picked by whoever uploads it (AI if they don't). */
export type CallTypeMode = "auto" | "ask";

export const isBuiltInCallType = (key: string): key is BuiltInCallType =>
  (BUILT_IN_CALL_TYPES as readonly string[]).includes(key);

const asGroup = (group: string): CallTypeGroup =>
  (CALL_TYPE_GROUPS as readonly string[]).includes(group) ? (group as CallTypeGroup) : "other";

/** Built-ins first, in the manuals' order, then the company's own types in the order they were made. */
export function mergeCallTypes(overrides: readonly CallTypeOverride[]): CallTypeDefinition[] {
  const byKey = new Map(overrides.map((o) => [o.key, o]));
  const fromOverride = (o: CallTypeOverride, builtIn: boolean): CallTypeDefinition => ({
    key: o.key,
    name: o.name,
    description: o.description,
    group: asGroup(o.group),
    scorecard: o.scorecard,
    enabled: o.enabled,
    builtIn,
    customized: builtIn,
  });
  const builtIns = BUILT_IN_CALL_TYPES.map((key) => {
    const o = byKey.get(key);
    return o ? fromOverride(o, true) : defaultCallType(key);
  });
  const own = overrides.filter((o) => !isBuiltInCallType(o.key)).map((o) => fromOverride(o, false));
  return [...builtIns, ...own];
}

/**
 * A call type's definition, even for a key the company no longer has (a deleted type on an old
 * call): then it reads "Other" and isn't scored, so old calls still display.
 */
export function findCallType(catalog: readonly CallTypeDefinition[], key: CallType | null | undefined): CallTypeDefinition {
  const found = key ? catalog.find((t) => t.key === key) : undefined;
  if (found) return found;
  if (key && isBuiltInCallType(key)) return defaultCallType(key);
  return { ...defaultCallType("other"), key: key ?? "other", name: key ? "Removed type" : "Other" };
}

/** The types the AI and the upload picker may choose from. "Other" is always possible. */
export function activeCallTypes(catalog: readonly CallTypeDefinition[]): CallTypeDefinition[] {
  return catalog.filter((t) => t.enabled || t.key === "other");
}

/** A short, stable key for a company's own type. */
export function newCallTypeKey(random: () => string = () => crypto.randomUUID().slice(0, 8)) {
  return `custom-${random()}`;
}
