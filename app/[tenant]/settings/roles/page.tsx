import { notFound } from "next/navigation";
import { can, listRoles, PERMISSIONS, requireTenantAccess, type Permission } from "@/core/tenancy";
import { areasFor } from "../../_lib/areas";
import { SettingsPage, SettingsSection } from "../_components/settings-frame";
import { RolesSection } from "../_components/roles-section";

export default async function RolesSettingsPage({ params }: PageProps<"/[tenant]/settings/roles">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug);
  if (!areasFor(access.permissions).settings.roles) notFound();
  const roles = await listRoles(access.tenant.id);

  return (
    <SettingsPage>
      <SettingsSection
        id="settings-roles"
        title="Roles"
        description="What each role can do. Add custom roles to fit how your company works."
      >
        <RolesSection
          slug={slug}
          canEdit={can(access, "roles.manage")}
          roles={roles.map((r) => ({
            id: r.id,
            name: r.name,
            permissions: r.permissions,
            isOwner: r.isOwner,
            members: r.members,
          }))}
          catalog={(Object.keys(PERMISSIONS) as Permission[]).map((key) => ({
            key,
            label: PERMISSIONS[key],
            grantable: can(access, key),
          }))}
        />
      </SettingsSection>
    </SettingsPage>
  );
}
