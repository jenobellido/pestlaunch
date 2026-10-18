import Link from "next/link";
import { Logo } from "@/shared/ui/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted">Call Intelligence for pest control companies.</p>
        </div>
        <nav aria-label="Footer" className="flex gap-6 text-sm text-muted">
          <a href="#how" className="hover:text-fg">
            How it works
          </a>
          <a href="#privacy" className="hover:text-fg">
            Privacy
          </a>
          <Link href="/login" className="hover:text-fg">
            Log in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
