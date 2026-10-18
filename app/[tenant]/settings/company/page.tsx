import { LayoutGrid } from "lucide-react";
import { can, requireTenantAccess } from "@/core/tenancy";
import { Field } from "@/shared/ui/form";
import { baseModuleId, moduleRegistry } from "@/modules/registry";
import { updateCompanyName } from "../actions";
import { ModuleToggles, type ModuleRow } from "../_components/module-toggles";
import { NameForm } from "../_components/name-form";
import { SettingsPage, SettingsSection } from "../_components/settings-frame";

const NO_PERMISSION = "You don't have permission to change this.";

export default async function CompanySettingsPage({ params }: PageProps<"/[tenant]/settings/company">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug);
  const { tenant } = access;
  const canCompany = can(access, "company.manage");
  const canModules = can(access, "modules.manage");

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
    <SettingsPage>
      <SettingsSection id="settings-company" title="Company" description="Your company's name across PestLaunch.">
        {canCompany ? (
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
          <Field label="Company name" value={tenant.name} readOnly hint={NO_PERMISSION} />
        )}
      </SettingsSection>

      <SettingsSection
        id="settings-modules"
        title="Modules"
        description={`Turn features on or off for everyone at ${tenant.name}.${canModules ? "" : ` ${NO_PERMISSION}`}`}
      >
        <ModuleToggles slug={slug} modules={modules} canEdit={canModules} />
      </SettingsSection>
    </SettingsPage>
  );
}
