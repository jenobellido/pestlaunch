"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "@/shared/config/theme";
import { readThemePreference, saveThemePreference, subscribeTheme } from "@/shared/lib/theme";
import { Segmented } from "@/shared/ui/segmented";

const OPTIONS = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
] satisfies { id: ThemePreference; label: string; icon: typeof Sun }[];

/** Theme picker. Saves to a cookie and applies at once; no server round trip. */
export function ThemeSetting({ initial }: { initial: ThemePreference }) {
  // The server reads the same cookie, so the first render already shows the saved choice.
  const value = useSyncExternalStore(subscribeTheme, readThemePreference, () => initial);
  return <Segmented legend="Theme" value={value} onChange={saveThemePreference} options={OPTIONS} />;
}
