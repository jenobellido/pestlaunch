import Link from "next/link";
import { LayoutGrid, LogOut, Settings } from "lucide-react";
import { signOut } from "@/core/auth/actions";
import { requireTenantAccess } from "@/core/tenancy";
import { LogoMark } from "@/shared/ui/logo";
import { Bone } from "@/shared/ui/page-header";
import { getEnabledModules } from "@/modules/registry";
import { NavLink } from "./nav-link";

function initialsOf(name: string) {
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export async function TenantNav({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const { tenant, user, role } = await requireTenantAccess(slug);
  const modules = (await getEnabledModules(slug)).flatMap((m) => m.nav ?? []).filter((n) => n.inSidebar !== false);
  const displayName = user.name ?? user.email;

  // Icons are rendered here, on the server, so the client links get elements, not components.
  const items = [
    { href: `/${slug}`, label: "Overview", icon: <LayoutGrid aria-hidden />, exact: true },
    ...modules.map(({ href, label, icon: Icon }) => ({
      href: `/${slug}${href}`,
      label,
      icon: Icon ? <Icon aria-hidden /> : null,
      exact: false,
    })),
  ];
  const settings = { href: `/${slug}/settings`, label: "Settings", icon: <Settings aria-hidden /> };

  return (
    <>
      <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-56 shrink-0 flex-col justify-between md:flex">
        <div className="flex flex-col gap-8">
          <Link href={`/${slug}`} aria-label={`${tenant.name} overview`} className="flex items-center gap-2.5 pl-2">
            <LogoMark className="size-10 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-base leading-tight font-medium">{tenant.name}</span>
              <span className="block text-xs text-muted">Powered by PestLaunch</span>
            </span>
          </Link>
          <nav aria-label="Modules" className="flex flex-col gap-2 rounded-[28px] bg-card p-1.5">
            {items.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 rounded-[28px] bg-card p-1.5">
          <NavLink {...settings} />
          <form action={signOut}>
            <button
              type="submit"
              className="press flex h-11 w-full items-center gap-3 rounded-full pr-3 pl-[13px] text-sm text-muted hover:bg-card-2 hover:text-fg"
            >
              <LogOut className="size-[18px] shrink-0" aria-hidden />
              Log out
            </button>
          </form>
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-ink">
              {initialsOf(displayName)}
            </span>
            <span className="min-w-0 pr-2">
              <span className="block truncate text-sm font-medium">{displayName}</span>
              <span className="block truncate text-xs text-muted">{role.name}</span>
            </span>
          </div>
        </div>
      </aside>

      <nav
        aria-label="Modules"
        className="fixed inset-x-3 bottom-3 z-20 flex justify-between rounded-full bg-card p-1.5 shadow-[0_8px_24px_-14px_rgb(0_0_0/0.35)] md:hidden"
      >
        {items.map((item) => (
          <NavLink key={item.href} {...item} compact />
        ))}
        <NavLink {...settings} compact />
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Log out"
            className="press flex size-10 items-center justify-center rounded-full text-muted hover:text-fg"
          >
            <LogOut className="size-[18px]" aria-hidden />
          </button>
        </form>
      </nav>
    </>
  );
}

/** Same frame as the sidebar while the session loads. */
export function TenantNavSkeleton() {
  return (
    <div className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-56 shrink-0 flex-col justify-between md:flex" aria-hidden>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-2.5 pl-2">
          <LogoMark className="size-10 shrink-0" />
          <span className="space-y-1.5">
            <Bone className="h-4 w-28 rounded-full" />
            <span className="block text-xs text-muted">Powered by PestLaunch</span>
          </span>
        </div>
        <div className="flex flex-col gap-2 rounded-[28px] bg-card p-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Bone key={i} className="h-11 rounded-full bg-card-2" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-[28px] bg-card p-1.5">
        <Bone className="h-11 rounded-full bg-card-2" />
        <Bone className="h-11 rounded-full bg-card-2" />
        <div className="flex items-center gap-3">
          <Bone className="size-11 shrink-0 rounded-full bg-card-2" />
          <div className="space-y-1.5">
            <Bone className="h-3.5 w-24 rounded-full bg-card-2" />
            <Bone className="h-3 w-16 rounded-full bg-card-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
