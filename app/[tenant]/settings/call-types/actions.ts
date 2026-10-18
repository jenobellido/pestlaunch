"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { findCallType, isBuiltInCallType, newCallTypeKey, type CallTypeMode } from "@/core/calls";
import {
  countCallsOfType,
  deleteCallType,
  getCallTypes,
  resetCallType,
  saveCallType,
  setCallTypeEnabled,
  setCallTypeMode,
} from "@/core/calls/server";
import { can, checkTenantAccess } from "@/core/tenancy";
import { draftCallType } from "./_lib/draft";
import { callTypeInput, toOverride, type CallTypeInput } from "./_lib/input";

export type CallTypeResult = { ok: true; key?: string } | { ok: false; error: string };

const NO_PERMISSION = "You don't have permission to change call types.";

async function manager(slug: string) {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return { error: "Your session ended. Log in again." } as const;
  if (!can(result.access, "calltypes.manage")) return { error: NO_PERMISSION } as const;
  return { tenantId: result.access.tenant.id } as const;
}

/** Automatic (the AI picks each call's type) or ask whoever uploads. */
export async function updateCallTypeMode(slug: string, mode: CallTypeMode): Promise<CallTypeResult> {
  const m = await manager(slug);
  if ("error" in m) return { ok: false, error: m.error! };
  if (mode !== "auto" && mode !== "ask") return { ok: false, error: "Choose how calls get their type." };
  await setCallTypeMode(m.tenantId, mode);
  refresh();
  return { ok: true };
}

/** Saves an edited type, or creates one when `key` is null. */
export async function saveCallTypeAction(slug: string, key: string | null, input: CallTypeInput): Promise<CallTypeResult> {
  const m = await manager(slug);
  if ("error" in m) return { ok: false, error: m.error! };
  const parsed = callTypeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const catalog = await getCallTypes(m.tenantId);
  if (key && !catalog.some((t) => t.key === key)) return { ok: false, error: "That call type doesn't exist." };
  const clash = catalog.find((t) => t.key !== key && t.name.toLowerCase() === parsed.data.name.toLowerCase());
  if (clash) return { ok: false, error: `There's already a call type called "${clash.name}".` };
  // "Other" catches everything the other types don't, so it can't be turned off.
  const enabled = key === "other" ? true : parsed.data.enabled;
  const saveKey = key ?? newCallTypeKey();
  await saveCallType(m.tenantId, toOverride(saveKey, { ...parsed.data, enabled }));
  refresh();
  return { ok: true, key: saveKey };
}

export async function toggleCallType(slug: string, key: string, enabled: boolean): Promise<CallTypeResult> {
  const m = await manager(slug);
  if ("error" in m) return { ok: false, error: m.error! };
  if (key === "other") return { ok: false, error: "Other catches every call the other types don't, so it stays on." };
  const current = (await getCallTypes(m.tenantId)).find((t) => t.key === key);
  if (!current) return { ok: false, error: "That call type doesn't exist." };
  await setCallTypeEnabled(m.tenantId, current, enabled);
  refresh();
  return { ok: true };
}

/** Puts a built-in type back as the manuals have it. */
export async function resetCallTypeAction(slug: string, key: string): Promise<CallTypeResult> {
  const m = await manager(slug);
  if ("error" in m) return { ok: false, error: m.error! };
  if (!isBuiltInCallType(key)) return { ok: false, error: "Only built-in call types can be reset." };
  await resetCallType(m.tenantId, key);
  refresh();
  return { ok: true, key };
}

/** Deletes one of the company's own types, if no call uses it (otherwise turn it off). */
export async function deleteCallTypeAction(slug: string, key: string): Promise<CallTypeResult> {
  const m = await manager(slug);
  if ("error" in m) return { ok: false, error: m.error! };
  if (isBuiltInCallType(key)) return { ok: false, error: "Built-in call types can be turned off, not deleted." };
  const used = await countCallsOfType(m.tenantId, key);
  if (used > 0) {
    const name = findCallType(await getCallTypes(m.tenantId), key).name;
    return { ok: false, error: `${used} call${used === 1 ? " is" : "s are"} filed as ${name}. Turn it off instead, so they keep their type.` };
  }
  await deleteCallType(m.tenantId, key);
  refresh();
  return { ok: true };
}

const briefInput = z.string().trim().min(15, "Describe the kind of call in a sentence or two.").max(6000, "Paste a shorter part of the manual (up to about a page).");

/** The setup assistant: drafts a type and scorecard from a description. Nothing is saved. */
export async function draftCallTypeAction(
  slug: string,
  brief: string,
): Promise<{ ok: true; draft: CallTypeInput } | { ok: false; error: string }> {
  const m = await manager(slug);
  if ("error" in m) return { ok: false, error: m.error! };
  const parsed = briefInput.safeParse(brief);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  try {
    return { ok: true, draft: await draftCallType(parsed.data, await getCallTypes(m.tenantId)) };
  } catch (err) {
    console.error("[call types] draft failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "The assistant couldn't draft that just now. Try again, or set it up by hand." };
  }
}
