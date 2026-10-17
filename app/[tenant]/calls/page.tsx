import { can, listMembers } from "@/core/tenancy";
import { CallsPage } from "@/modules/calls";
import { callScope } from "@/modules/calls/server";
import { isModuleEnabled } from "@/modules/registry";
import { requireModule } from "../_lib/require-module";
import { ScoreBadge } from "./_components/score-badge";

export default async function Page({ params }: PageProps<"/[tenant]/calls">) {
  const access = await requireModule(params, "calls");
  const { tenant, user, permissions } = access;
  const canAssign = can(access, "calls.assign");
  // The list shows each call's score only when the scorecards module is on.
  const [scored, members] = await Promise.all([
    isModuleEnabled(tenant.slug, "scorecards"),
    canAssign ? listMembers(tenant.id) : Promise.resolve(null),
  ]);
  return (
    <CallsPage
      tenantSlug={tenant.slug}
      scope={callScope({ userId: user.id, permissions })}
      canUpload={can(access, "calls.upload")}
      members={members?.map((m) => ({ id: m.userId, name: m.displayName }))}
      score={scored ? (call) => <ScoreBadge analyses={call.analyses} /> : undefined}
    />
  );
}
