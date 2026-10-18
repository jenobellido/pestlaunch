"use client";

import { useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "@/shared/config/theme";
import { cn } from "@/shared/lib/cn";
import { readThemePreference, saveThemePreference, subscribeTheme } from "@/shared/lib/theme";

const OPTIONS: { id: ThemePreference; label: string; hint: string; icon: typeof Sun }[] = [
  { id: "system", label: "System", hint: "Match your device", icon: Monitor },
  { id: "light", label: "Light", hint: "Bright and clear", icon: Sun },
  { id: "dark", label: "Dark", hint: "Easy on the eyes", icon: Moon },
];

// Fixed colours from app/globals.css, so each card previews its own theme whatever is active.
const PREVIEW = {
  light: { bg: "#f4f5f7", side: "#ffffff", card: "#ffffff", line: "#e4e7ec", accent: "#1d5fd6", text: "#101828" },
  dark: { bg: "#141414", side: "#272727", card: "#272727", line: "#3a3a3a", accent: "#6aa4ff", text: "#f5f5f3" },
} as const;

/** A tiny app window: sidebar, title and a card with an accent pill. */
function Preview({ variant }: { variant: keyof typeof PREVIEW }) {
  const c = PREVIEW[variant];
  return (
    <div className="flex size-full gap-1.5 p-2" style={{ background: c.bg }}>
      <div className="flex w-4 flex-col gap-1 rounded-md p-0.5" style={{ background: c.side }}>
        <div className="h-1.5 rounded-sm" style={{ background: c.accent }} />
        <div className="h-1.5 rounded-sm" style={{ background: c.line }} />
        <div className="h-1.5 rounded-sm" style={{ background: c.line }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-2 w-2/3 rounded-sm" style={{ background: c.text, opacity: 0.8 }} />
        <div className="flex-1 rounded-md p-1.5" style={{ background: c.card, border: `1px solid ${c.line}` }}>
          <div className="h-1.5 w-1/2 rounded-sm" style={{ background: c.line }} />
          <div className="mt-1.5 h-3 w-1/3 rounded-full" style={{ background: c.accent }} />
        </div>
      </div>
    </div>
  );
}

/** System, Light or Dark as preview cards. Saves to a cookie and applies at once; no server round trip. */
export function ThemePicker({ initial }: { initial: ThemePreference }) {
  // The server read the same cookie, so the first render already selects the saved choice.
  const current = useSyncExternalStore(subscribeTheme, readThemePreference, () => initial);

  return (
    <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map(({ id, label, hint, icon: Icon }) => {
        const selected = current === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} theme. ${hint}.`}
            onClick={() => saveThemePreference(id)}
            className={cn(
              "press relative overflow-hidden rounded-2xl border bg-card text-left transition-colors focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none",
              selected ? "border-accent ring-4 ring-accent/15" : "border-line hover:border-line-strong",
            )}
          >
            <div className="relative h-24 overflow-hidden border-b border-line">
              {id === "system" ? (
                // Half light, half dark.
                <div className="flex size-full">
                  <div className="w-1/2 overflow-hidden">
                    <div className="h-full w-[200%]">
                      <Preview variant="light" />
                    </div>
                  </div>
                  <div className="relative w-1/2 overflow-hidden">
                    <div className="absolute inset-y-0 right-0 h-full w-[200%]">
                      <Preview variant="dark" />
                    </div>
                  </div>
                </div>
              ) : (
                <Preview variant={id} />
              )}
              {selected && (
                <span
                  className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-accent text-accent-ink"
                  aria-hidden
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <Icon className="size-4 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted">{hint}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
