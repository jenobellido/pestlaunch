"use client";

import { useId } from "react";
import { cn } from "@/shared/lib/cn";

/** Two or three options as one row of pill buttons. Controlled; `name` adds a hidden input for forms. */
export function Segmented<T extends string>({
  name,
  legend,
  value,
  onChange,
  options,
}: {
  name?: string;
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: React.ComponentType<{ className?: string }> }[];
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      {name && <input type="hidden" name={name} value={value} />}
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        <span id={id} className="sr-only">
          {legend}
        </span>
        {options.map(({ id: optionId, label, icon: Icon }) => (
          <button
            key={optionId}
            type="button"
            role="radio"
            aria-checked={value === optionId}
            onClick={() => onChange(optionId)}
            className={cn(
              "press flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm transition-colors focus-visible:ring-4 focus-visible:ring-accent/15 focus-visible:outline-none",
              value === optionId
                ? "border-accent bg-accent/10 text-fg"
                : "border-line bg-card text-fg/80 hover:border-line-strong",
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
