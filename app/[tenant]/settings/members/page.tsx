import { headers } from "next/headers";
import { can, canGrantRole, listInvites, listMembers, listRoles, requireTenantAccess } from "@/core/tenancy";
import { SettingsPage, SettingsSection } from "../_components/settings-frame";
import { TeamSection } from "../_components/team-section";

export default async function MembersSettingsPage({ params }: PageProps<"/[tenant]/settings/members">) {
  const { tenant: slug } = await params;
  const [access, h] = await Promise.all([requireTenantAccess(slug), headers()]);
  const { tenant, user, role } = access;
  const canManage = can(access, "team.manage");
  const [members, roles, invites] = await Promise.all([
    listMembers(tenant.id),
    listRoles(tenant.id),
    canManage ? listInvites(tenant.id) : Promise.resolve([]),
  ]);

  // Invite links point back at whichever host this page was opened on.
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;

  return (
    <SettingsPage>
      <SettingsSection
        id="settings-members"
        title="Members"
        description="Everyone in the company and their role. Invite people with a link; reps only see their own calls."
      >
        <TeamSection
          slug={slug}
          canManage={canManage}
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
    </SettingsPage>
  );
}
