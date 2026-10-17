import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/core/tenancy";
import { getEnabledModules } from "@/modules/registry";

export async function TenantNav({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const modules = await getEnabledModules(slug);
  const items = modules.flatMap((m) => m.nav ?? []);

  return (
    <nav className="flex flex-col gap-1">
      <Link href={`/${slug}`} className="mb-4 font-semibold">
        {tenant.name}
      </Link>
      {items.map((item) => (
        <Link
          key={item.href}
          href={`/${slug}${item.href}`}
          className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
