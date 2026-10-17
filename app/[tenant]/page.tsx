import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { requireTenantAccess } from "@/core/tenancy";
import { Bone, PageHeader, PageStack } from "@/shared/ui/page-header";
import { getEnabledModules } from "@/modules/registry";

async function EnabledModules({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  await requireTenantAccess(tenant);
  const modules = await getEnabledModules(tenant);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((m) => {
        const nav = m.nav?.[0];
        const Icon = nav?.icon ?? LayoutGrid;
        return (
          <li key={m.id}>
            <Link
              href={`/${tenant}${nav?.href ?? ""}`}
              className="group flex h-full flex-col gap-4 rounded-[28px] bg-card p-6 transition-colors hover:bg-card-2"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-medium">{m.name}</span>
                {m.description && <span className="mt-1 block text-sm text-muted">{m.description}</span>}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted group-hover:text-fg">
                Open
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EnabledModulesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <Bone key={i} className="h-48 rounded-[28px]" />
      ))}
    </div>
  );
}

export default function TenantDashboardPage({ params }: PageProps<"/[tenant]">) {
  return (
    <PageStack>
      <PageHeader title="Overview" description="Your Call Intelligence modules." icon={LayoutGrid} />
      <Suspense fallback={<EnabledModulesSkeleton />}>
        <EnabledModules params={params} />
      </Suspense>
    </PageStack>
  );
}
