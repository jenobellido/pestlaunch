import { cookies } from "next/headers";
import { parseThemePreference, THEME_COOKIE } from "@/shared/config/theme";
import { SettingsPage, SettingsSection } from "../_components/settings-frame";
import { ThemePicker } from "../_components/theme-picker";

export default async function AppearanceSettingsPage() {
  // The same cookie the boot script reads, so the right card is selected on the first render.
  const initial = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <SettingsPage>
      <SettingsSection
        id="settings-appearance"
        title="Theme"
        description="Choose a theme, or follow your device's light and dark setting. Saved on this browser."
      >
        <ThemePicker initial={initial} />
      </SettingsSection>
    </SettingsPage>
  );
}
