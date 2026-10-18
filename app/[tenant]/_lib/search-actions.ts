"use server";

import { can, checkTenantAccess, listMembers } from "@/core/tenancy";
import { callScope, searchCalls, type CallSearchHit } from "@/modules/calls/server";
import { getEnabledModuleIds } from "@/modules/registry";

export interface RepSearchHit {
  id: string;
  name: string;
  role: string;
}

export interface SearchResults {
  calls: CallSearchHit[];
  reps: RepSearchHit[];
}

const EMPTY: SearchResults = { calls: [], reps: [] };

/**
 * The quick search (⌘K). Only searches what the viewer could open anyway: their own calls
 * unless they may see every call, and reps only for people who can view others' pages.
 */
export async function searchWorkspace(slug: string, query: string): Promise<SearchResults> {
  const result = await checkTenantAccess(slug);
  if (!result.ok) return EMPTY;
  const { access } = result;
  const q = query.slice(0, 100);
  const enabled = await getEnabledModuleIds(slug);
  const seesEveryone = can(access, "calls.view_all");

  const [found, members] = await Promise.all([
    searchCalls(slug, q, callScope({ userId: access.user.id, permissions: access.permissions })),
    enabled.has("coaching") && seesEveryone && q.trim() ? listMembers(access.tenant.id) : Promise.resolve([]),
  ]);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const reps = members
    .filter((m) => terms.every((t) => `${m.displayName} ${m.email}`.toLowerCase().includes(t)))
    .slice(0, 5)
    .map((m) => ({ id: m.userId, name: m.displayName, role: m.role.name }));
  return { calls: found, reps };
}
