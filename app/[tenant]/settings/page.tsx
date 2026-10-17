import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import {
  can,
  canGrantRole,
  listInvites,
  listMembers,
  listRoles,
  PERMISSIONS,
  requireTenantAccess,
  type Permission,
} from "@/core/tenancy";
import { parseThemePreference, THEME_COOKIE } from "@/shared/config/theme";
import { Field } from "@/shared/ui/form";
import { PageStack } from "@/shared/ui/page-header";
import { baseModuleId, moduleRegistry } from "@/modules/registry";
import { updateCompanyName, updateProfile } from "./actions";
import { ModuleToggles, type ModuleRow } from "./_components/module-toggles";
import { RolesSection } from "./_components/roles-section";
import { TeamSection } from "./_components/team-section";
import { NameForm } from "./_components/name-form";
import { SettingsBodySkeleton, SettingsHeader, SettingsSection } from "./_components/settings-frame";
import { ThemeSetting } from "./_components/theme-setting";

async function SettingsBody({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const [access, cookieStore, h] = await Promise.all([requireTenantAccess(slug), cookies(), headers()]);
  const { tenant, user, role } = access;
  const [members, roles, invites] = await Promise.all([
    listMembers(tenant.id),
    listRoles(tenant.id),
    can(access, "team.manage") ? listInvites(tenant.id) : Promise.resolve([]),
  ]);
  const canCompany = can(access, "company.manage");
  const canModules = can(access, "modules.manage");
  const noPermission = "You don't have permission to change this.";

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;

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
        description={`Your workspace. Your role here is ${role.name}.`}
      >
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
          <Field label="Company name" value={tenant.name} readOnly hint={noPermission} />
        )}
      </SettingsSection>

      <SettingsSection
        id="settings-modules"
        title="Modules"
        description={`Turn features on or off for everyone at ${tenant.name}.${canModules ? "" : ` ${noPermission}`}`}
      >
        <ModuleToggles slug={slug} modules={modules} canEdit={canModules} />
      </SettingsSection>

      <SettingsSection
        id="settings-team"
        title="Team"
        description="Everyone in the company and their role. Invite people with a link; reps only see their own calls."
      >
        <TeamSection
          slug={slug}
          canManage={can(access, "team.manage")}
          members={members.map((m) => ({
            userId: m.userId,
            name: m.displayName,
            email: m.email,
            roleId: m.role.id,
            roleName: m.role.name,
            isYou: m.userId === user.id,
            editable: canGrantRole(role, m.role),
          }))}
          invites={invites.map((i) => ({
            id: i.id,
            email: i.email,
            roleName: i.role.name,
            link: `${origin}/invite/${i.token}`,
          }))}
          roles={roles.map((r) => ({ id: r.id, name: r.name, grantable: canGrantRole(role, r) }))}
        />
      </SettingsSection>

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
