import { can } from "@/core/tenancy";
import { getCallTypes } from "@/core/calls/server";
import { ScorecardsPage } from "@/modules/scorecards";
import { requireModule } from "../_lib/require-module";

export default async function Page({ params }: PageProps<"/[tenant]/scorecards">) {
  const access = await requireModule(params, "scorecards");
  const types = await getCallTypes(access.tenant.id);
  return (
    <ScorecardsPage
      types={types}
      editHref={can(access, "calltypes.manage") ? `/${access.tenant.slug}/settings/call-types` : undefined}
    />
  );
}
