"use client";

import { useEffect } from "react";
import { applyTheme, readThemePreference } from "@/shared/lib/theme";

/**
 * When the preference is "system", follows the device live: switching the OS to light or
 * dark (or an automatic sunset switch) updates the page without a reload.
 */
export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (readThemePreference() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return null;
}
