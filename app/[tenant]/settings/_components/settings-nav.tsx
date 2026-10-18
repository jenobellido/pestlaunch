"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/cn";
import { NavPill, navLabelStyle } from "@/shared/ui/nav-pill";

export interface SettingsNavItem {
  href: string;
  label: string;
  /** Rendered on the server; components can't cross to the client. */
  icon: React.ReactNode;
}

/**
 * The settings menu: a column of pills with icons beside the page on wide screens, and a
 * row of labels above it on small ones (scrolling sideways on phones). The first item is the settings root, so it
 * only counts as active on its exact path.
 */
export function SettingsNav({ items }: { items: SettingsNavItem[] }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  // On phones the row scrolls sideways; keep the current page's pill in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <nav
      aria-label="Settings"
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:sticky lg:top-6 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex w-max gap-1.5 rounded-full bg-card p-1.5 lg:w-auto lg:flex-col lg:gap-2 lg:rounded-[28px]">
        {items.map((item, i) => {
          const active = i === 0 ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                ref={active ? activeRef : undefined}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center rounded-full px-4 text-sm whitespace-nowrap transition-colors duration-300 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none lg:h-11 lg:pr-3 lg:pl-[13px]",
                  active ? "font-medium text-accent-ink" : "text-muted hover:bg-card-2 hover:text-fg",
                )}
              >
                {active && <NavPill menu="settings-nav" />}
                <span
                  className="relative flex items-center gap-2.5 [&_svg]:hidden [&_svg]:size-[18px] [&_svg]:shrink-0 lg:[&_svg]:block"
                  style={navLabelStyle("settings-nav", item.href)}
                >
                  {item.icon}
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
