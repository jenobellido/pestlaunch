import { CallsPage } from "@/modules/calls";
import { requireModule } from "../_lib/require-module";

export default async function Page({ params }: PageProps<"/[tenant]/calls">) {
  const tenant = await requireModule(params, "calls");
  return <CallsPage tenantSlug={tenant} />;
}
