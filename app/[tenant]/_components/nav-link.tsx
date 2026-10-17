"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/cn";

/** A sidebar row that turns into a mint pill when its page (or a page under it) is open. */
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
  return (
    <Link
      href={href}
      aria-label={compact ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-full text-sm transition-colors duration-300 [&_svg]:size-[18px] [&_svg]:shrink-0",
        compact ? "size-10 justify-center" : "h-11 w-full min-w-0 gap-3 pr-3 pl-[13px]",
        active ? "bg-accent font-medium text-accent-ink" : "text-muted hover:bg-card-2 hover:text-fg",
      )}
    >
      {icon}
      {!compact && <span className="min-w-0 truncate">{label}</span>}
    </Link>
  );
}
