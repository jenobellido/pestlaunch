import { Suspense } from "react";
import { TenantNav, TenantNavSkeleton } from "./_components/tenant-nav";

export default function TenantLayout({ children, params }: LayoutProps<"/[tenant]">) {
  return (
    <div className="flex min-h-dvh flex-1 gap-6 bg-panel p-4 pb-24 sm:p-6 sm:pb-24 md:pb-6">
      <Suspense fallback={<TenantNavSkeleton />}>
        <TenantNav params={params} />
      </Suspense>
      <main className="min-w-0 flex-1">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
}
