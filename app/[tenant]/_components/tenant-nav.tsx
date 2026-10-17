import Link from "next/link";
import { signOut } from "@/core/auth/actions";
import { requireTenantAccess } from "@/core/tenancy";
import { getEnabledModules } from "@/modules/registry";

export async function TenantNav({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const { tenant, user } = await requireTenantAccess(slug);
  const items = (await getEnabledModules(slug)).flatMap((m) => m.nav ?? []);

  return (
    <nav className="flex h-full flex-col gap-1">
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
      <div className="mt-auto border-t border-black/10 pt-4 text-sm dark:border-white/10">
        <p className="truncate font-medium">{user.name ?? user.email}</p>
        <p className="truncate text-zinc-500">{user.email}</p>
        <form action={signOut}>
          <button type="submit" className="mt-2 text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
