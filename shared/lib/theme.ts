import {
  parseThemePreference,
  THEME_COOKIE,
  type ResolvedTheme,
  type ThemePreference,
} from "@/shared/config/theme";

// Browser-only helpers for the theme preference. The server never needs it: the boot
// script in shared/config/theme.ts applies it before first paint.

const listeners = new Set<() => void>();

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readThemePreference(): ThemePreference {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  return parseThemePreference(match?.[1]);
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Applies a theme to <html> right away and tells subscribers (e.g. the picker).
 * Transitions are paused for the switch, so colours change at once instead of fading.
 */
export function applyTheme(preference: ThemePreference) {
  const pause = document.createElement("style");
  pause.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(pause);

  document.documentElement.dataset.theme = resolveTheme(preference);
  document.documentElement.dataset.themePref = preference;
  listeners.forEach((listener) => listener());

  // Force a style flush with transitions off, then turn them back on.
  void getComputedStyle(document.body).color;
  requestAnimationFrame(() => pause.remove());
}

/** Saves the choice for a year and applies it. */
export function saveThemePreference(preference: ThemePreference) {
  document.cookie = `${THEME_COOKIE}=${preference}; path=/; max-age=31536000; samesite=lax`;
  applyTheme(preference);
}

/** Reads a colour token (e.g. "--accent") as currently themed, for canvases that can't use CSS. */
export function themeColor(token: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}
