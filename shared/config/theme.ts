/** Saved appearance choice. "system" follows the device's light or dark setting. */
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE = "pestlaunch-theme";

export function parseThemePreference(value: string | undefined): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/**
 * Runs before first paint (inlined by the root layout): reads the saved preference,
 * resolves "system" from the device, and sets <html data-theme> (light or dark) and
 * <html data-theme-pref> (the saved choice), so the page never flashes the wrong theme.
 * Dark is the default when the device can't be read. ThemeSync follows device changes live.
 */
export const THEME_BOOT_SCRIPT = `try{var d=document.documentElement,p=(document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/)||[])[1];if(p!=="light"&&p!=="dark")p="system";d.dataset.themePref=p;d.dataset.theme=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p}catch(e){}`;
