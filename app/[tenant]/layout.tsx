import { Suspense } from "react";
import { TenantNav } from "./_components/tenant-nav";

export default function TenantLayout({ children, params }: LayoutProps<"/[tenant]">) {
  return (
    <div className="flex flex-1">
      <aside className="w-56 shrink-0 border-r border-black/10 p-4 dark:border-white/10">
        <Suspense fallback={null}>
          <TenantNav params={params} />
        </Suspense>
      </aside>
      <main className="flex-1 p-8">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  );
}
