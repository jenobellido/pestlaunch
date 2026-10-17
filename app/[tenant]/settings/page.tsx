import { cookies } from "next/headers";
import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { requireTenantAccess } from "@/core/tenancy";
import { parseThemePreference, THEME_COOKIE } from "@/shared/config/theme";
import { Field } from "@/shared/ui/form";
import { PageStack } from "@/shared/ui/page-header";
import { baseModuleId, moduleRegistry } from "@/modules/registry";
import { updateCompanyName, updateProfile } from "./actions";
import { ModuleToggles, type ModuleRow } from "./_components/module-toggles";
import { NameForm } from "./_components/name-form";
import { SettingsBodySkeleton, SettingsHeader, SettingsSection } from "./_components/settings-frame";
import { ThemeSetting } from "./_components/theme-setting";

const ROLE_LABEL = { owner: "Owner", manager: "Manager", rep: "Rep" } as const;

async function SettingsBody({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const [{ tenant, user, role }, cookieStore] = await Promise.all([requireTenantAccess(slug), cookies()]);
  const isOwner = role === "owner";
  const ownersOnly = isOwner ? undefined : "Only owners can change this.";

  const modules: ModuleRow[] = moduleRegistry.map((m) => {
    const Icon = m.nav?.[0]?.icon ?? LayoutGrid;
    return {
      id: m.id,
      name: m.name,
      description: m.description,
      icon: <Icon aria-hidden />,
      dependsOn: (m.dependsOn ?? []).map((id) => ({
        id,
        name: moduleRegistry.find((dep) => dep.id === id)?.name ?? id,
      })),
      enabled: m.id === baseModuleId || (tenant.modules[m.id] ?? m.defaultEnabled),
      locked: m.id === baseModuleId,
    };
  });

  return (
    <div className="space-y-4">
      <SettingsSection
        id="settings-appearance"
        title="Appearance"
        description="Choose a theme, or follow your device's light and dark setting."
      >
        <ThemeSetting initial={parseThemePreference(cookieStore.get(THEME_COOKIE)?.value)} />
      </SettingsSection>

      <SettingsSection id="settings-profile" title="Profile" description="How you appear to your team.">
        <NameForm
          action={updateProfile}
          name="fullName"
          label="Display name"
          autoComplete="name"
          defaultValue={user.name ?? ""}
          submitLabel="Save profile"
        >
          <Field label="Email" type="email" value={user.email} readOnly hint="Your login email." />
        </NameForm>
      </SettingsSection>

      <SettingsSection
        id="settings-company"
        title="Company"
        description={`Your workspace. You're ${isOwner ? "an" : "a"} ${ROLE_LABEL[role].toLowerCase()} here.`}
      >
        {isOwner ? (
          <NameForm
            action={updateCompanyName.bind(null, slug)}
            name="companyName"
            label="Company name"
            autoComplete="organization"
            defaultValue={tenant.name}
            hint={`Your workspace address stays /${slug}.`}
            submitLabel="Save company"
          />
        ) : (
          <Field label="Company name" value={tenant.name} readOnly hint={ownersOnly} />
        )}
      </SettingsSection>

      <SettingsSection
        id="settings-modules"
        title="Modules"
        description={`Turn features on or off for everyone at ${tenant.name}.${ownersOnly ? ` ${ownersOnly}` : ""}`}
      >
        <ModuleToggles slug={slug} modules={modules} canEdit={isOwner} />
      </SettingsSection>
    </div>
  );
}

export default function SettingsPage({ params }: PageProps<"/[tenant]/settings">) {
  return (
    <PageStack>
      <SettingsHeader />
      <Suspense fallback={<SettingsBodySkeleton />}>
        <SettingsBody params={params} />
      </Suspense>
    </PageStack>
  );
}
