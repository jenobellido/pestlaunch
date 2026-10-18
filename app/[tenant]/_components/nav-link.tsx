"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/cn";
import { NavPill, navLabelStyle } from "@/shared/ui/nav-pill";

/** A sidebar row that gets the accent pill when its page (or a page under it) is open. The pill glides between rows. */
export function NavLink({
  href,
  label,
  icon,
  exact = false,
  compact = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Only the exact path counts as active, e.g. the tenant overview. */
  exact?: boolean;
  /** Icon-only, for the mobile nav. */
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));
  // The sidebar and the mobile bar are separate menus, each with its own pill.
  const menu = compact ? "mobile-nav" : "sidebar";
  return (
    <Link
      href={href}
      aria-label={compact ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center rounded-full text-sm transition-colors duration-300",
        compact ? "size-10 justify-center" : "h-11 w-full min-w-0 pr-3 pl-[13px]",
        active ? "font-medium text-accent-ink" : "text-muted hover:bg-card-2 hover:text-fg",
      )}
    >
      {active && <NavPill menu={menu} />}
      <span
        className="relative flex min-w-0 items-center gap-3 [&_svg]:size-[18px] [&_svg]:shrink-0"
        style={navLabelStyle(menu, href)}
      >
        {icon}
        {!compact && <span className="min-w-0 truncate">{label}</span>}
      </span>
    </Link>
  );
}
