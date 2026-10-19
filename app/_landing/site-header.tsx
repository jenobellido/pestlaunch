import Link from "next/link";
import { primaryButton } from "@/shared/ui/button";
import { Logo } from "@/shared/ui/logo";

const LINKS = [
  { href: "#preview", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#privacy", label: "Privacy" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/0 bg-bg/70 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/55">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" aria-label="PestLaunch home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-0.5 rounded-full border border-line bg-card/50 p-1 backdrop-blur md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-sm text-muted transition-colors hover:bg-chip hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Link
            href="/login"
            className="rounded-full px-3 py-2 text-sm whitespace-nowrap text-muted transition-colors hover:text-fg sm:px-3.5"
          >
            Log in
          </Link>
          <Link href="/signup" className={`${primaryButton} h-10 px-4 whitespace-nowrap`}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
