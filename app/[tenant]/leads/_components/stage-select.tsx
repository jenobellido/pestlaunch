"use client";

import { useId, useState, useTransition } from "react";
import { Spinner } from "@/shared/ui/button";
import { moveLead } from "../actions";

const STAGES = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "booked", label: "Booked" },
  { id: "lost", label: "Lost" },
] as const;

/** Moves a lead to another column. */
export function StageSelect({ slug, leadId, stage }: { slug: string; leadId: string; stage: string }) {
  const id = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-1.5">
      <label htmlFor={id} className="sr-only">
        Move to
      </label>
      <select
        id={id}
        value={stage}
        disabled={pending}
        title={error ?? "Move to another stage"}
        onChange={(e) => {
          const next = e.target.value;
          setError(null);
          start(async () => {
            const result = await moveLead(slug, leadId, next);
            if (!result.ok) setError(result.error ?? "Couldn't move the lead.");
          });
        }}
        className="h-8 rounded-full border border-line bg-card px-2.5 text-xs outline-none transition-colors hover:border-accent focus:border-accent focus:ring-4 focus:ring-accent/15"
      >
        {STAGES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {pending && <Spinner className="size-3.5" />}
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
