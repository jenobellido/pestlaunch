import { Suspense } from "react";
import { requireTenantAccess } from "@/core/tenancy";
import { PageHeader } from "@/shared/ui/page-header";
import { getEnabledModules } from "@/modules/registry";

async function EnabledModules({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  await requireTenantAccess(tenant);
  const modules = await getEnabledModules(tenant);
  return (
    <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400">
      {modules.map((m) => (
        <li key={m.id}>{m.name}</li>
      ))}
    </ul>
  );
}

export default function TenantDashboardPage({ params }: PageProps<"/[tenant]">) {
  return (
    <>
      <PageHeader title="Dashboard" />
      <Suspense fallback={null}>
        <EnabledModules params={params} />
      </Suspense>
    </>
  );
}
