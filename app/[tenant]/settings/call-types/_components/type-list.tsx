"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { FormAlert, Switch } from "@/shared/ui/form";
import { toggleCallType } from "../actions";

export interface TypeRow {
  key: string;
  name: string;
  description: string;
  groupLabel: string;
  /** e.g. "Sales Calls · 17 steps · Gold 17" or "Not scored". */
  scoring: string;
  enabled: boolean;
  tag: "Default" | "Edited" | "Custom";
  calls: number;
}

/** The company's call types, each with an on/off switch and a link to edit it. */
export function TypeList({ slug, rows, canEdit }: { slug: string; rows: TypeRow[]; canEdit: boolean }) {
  const [enabled, setOptimistic] = useOptimistic(
    Object.fromEntries(rows.map((r) => [r.key, r.enabled])),
    (state, change: { key: string; on: boolean }) => ({ ...state, [change.key]: change.on }),
  );
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div className="grid gap-3">
      <ul className="divide-y divide-line">
        {rows.map((row) => {
          const on = enabled[row.key];
          const labelId = `type-${row.key}`;
          return (
            <li key={row.key} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
              <div className={cn("min-w-0 flex-1", !on && "opacity-60")}>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span id={labelId} className="text-sm font-medium">
                    {row.name}
                  </span>
                  <span className="rounded-full bg-chip px-2 py-px text-[11px] text-muted">{row.groupLabel}</span>
                  {row.tag !== "Default" && (
                    <span className="rounded-full bg-accent/10 px-2 py-px text-[11px] font-medium text-accent">{row.tag}</span>
                  )}
                </p>
                <p className="mt-0.5 line-clamp-1 text-sm text-muted">{row.description}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {row.scoring}
                  {row.calls > 0 && ` · ${row.calls} call${row.calls === 1 ? "" : "s"}`}
                </p>
              </div>
              {canEdit && row.key !== "other" && (
                <Switch
                  checked={on}
                  aria-labelledby={labelId}
                  onChange={(next) =>
                    start(async () => {
                      setError(null);
                      setOptimistic({ key: row.key, on: next });
                      const result = await toggleCallType(slug, row.key, next);
                      if (!result.ok) setError(result.error);
                    })
                  }
                />
              )}
              {canEdit && (
                <Link
                  href={`/${slug}/settings/call-types/${row.key}`}
                  aria-label={`Edit ${row.name}`}
                  className="press flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-fg"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}
