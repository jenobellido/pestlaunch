import { CoachingPage } from "@/modules/coaching";
import { requireModule } from "../_lib/require-module";

export default async function Page({ params }: PageProps<"/[tenant]/coaching">) {
  const { tenant } = await requireModule(params, "coaching");
  return <CoachingPage tenantSlug={tenant.slug} />;
}
