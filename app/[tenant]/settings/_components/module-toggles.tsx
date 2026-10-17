"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { FormAlert, Switch } from "@/shared/ui/form";
import { setModuleEnabled } from "../actions";

export interface ModuleRow {
  id: string;
  name: string;
  description?: string;
  /** Rendered on the server; components can't cross to the client. */
  icon: React.ReactNode;
  dependsOn: { id: string; name: string }[];
  /** The tenant's setting, or the module's default when it has none. */
  enabled: boolean;
  /** The base module, always on. */
  locked: boolean;
}

/** One switch per module. Saves on change, optimistically; owners only. */
export function ModuleToggles({ slug, modules, canEdit }: { slug: string; modules: ModuleRow[]; canEdit: boolean }) {
  const saved = Object.fromEntries(modules.map((m) => [m.id, m.enabled]));
  const [settings, setOptimistic] = useOptimistic(
    saved,
    (current, change: { id: string; enabled: boolean }) => ({ ...current, [change.id]: change.enabled }),
  );
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [, startTransition] = useTransition();
  const baseId = useId();

  function toggle(row: ModuleRow, enabled: boolean) {
    setMessage(null);
    startTransition(async () => {
      setOptimistic({ id: row.id, enabled });
      const result = await setModuleEnabled(slug, row.id, enabled);
      setMessage(
        result.ok
          ? { tone: "info", text: `${row.name} turned ${enabled ? "on" : "off"}.` }
          : { tone: "error", text: result.error },
      );
    });
  }

  return (
    <div className="grid gap-4">
      <ul className="divide-y divide-line">
        {modules.map((row) => {
          const missing = row.dependsOn.filter((dep) => !settings[dep.id]);
          const on = settings[row.id] && missing.length === 0;
          const labelId = `${baseId}-${row.id}`;
          const note = row.locked
            ? "Always on. The other modules build on it."
            : missing.length > 0
              ? `Needs ${missing.map((d) => d.name).join(" and ")}.`
              : null;
          return (
            <li key={row.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent [&_svg]:size-[18px]">
                {row.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p id={labelId} className="text-sm font-medium">
                  {row.name}
                </p>
                {row.description && <p className="text-sm text-muted">{row.description}</p>}
                {note && <p className="mt-1 text-xs text-muted">{note}</p>}
              </div>
              <Switch
                checked={on}
                disabled={!canEdit || row.locked || missing.length > 0}
                onChange={(enabled) => toggle(row, enabled)}
                aria-labelledby={labelId}
              />
            </li>
          );
        })}
      </ul>
      {message && <FormAlert tone={message.tone}>{message.text}</FormAlert>}
    </div>
  );
}
