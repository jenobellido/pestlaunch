import { CallsPage } from "@/modules/calls";
import { isModuleEnabled } from "@/modules/registry";
import { requireModule } from "../_lib/require-module";
import { ScoreBadge } from "./_components/score-badge";

export default async function Page({ params }: PageProps<"/[tenant]/calls">) {
  const { tenant } = await requireModule(params, "calls");
  // The list shows each call's score only when the scorecards module is on.
  const scored = await isModuleEnabled(tenant.slug, "scorecards");
  return (
    <CallsPage
      tenantSlug={tenant.slug}
      score={scored ? (call) => <ScoreBadge analyses={call.analyses} /> : undefined}
    />
  );
}
