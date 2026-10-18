"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Hand, Sparkles } from "lucide-react";
import type { CallTypeMode } from "@/core/calls";
import { cn } from "@/shared/lib/cn";
import { FormAlert } from "@/shared/ui/form";
import { updateCallTypeMode } from "../actions";

const OPTIONS: { id: CallTypeMode; title: string; body: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    id: "auto",
    title: "Automatic",
    body: "The AI reads each call and picks its type. You can correct it on the call.",
    icon: Sparkles,
  },
  {
    id: "ask",
    title: "Ask on upload",
    body: "Whoever uploads picks the type, or leaves it to the AI. A picked type is never changed by the AI.",
    icon: Hand,
  },
];

/** How a call gets its type. Saves on click. */
export function ModePicker({ slug, mode, canEdit }: { slug: string; mode: CallTypeMode; canEdit: boolean }) {
  const [current, setOptimistic] = useOptimistic(mode, (_: CallTypeMode, next: CallTypeMode) => next);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div className="grid gap-3">
      <div role="radiogroup" aria-label="How calls get their type" className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ id, title, body, icon: Icon }) => {
          const on = current === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!canEdit}
              onClick={() =>
                start(async () => {
                  setError(null);
                  setOptimistic(id);
                  const result = await updateCallTypeMode(slug, id);
                  if (!result.ok) setError(result.error);
                })
              }
              className={cn(
                "press flex gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed",
                on ? "border-accent bg-accent/10" : "border-line hover:border-line-strong",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  on ? "bg-accent text-accent-ink" : "bg-chip text-muted",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{title}</span>
                <span className="mt-0.5 block text-sm text-muted">{body}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}
