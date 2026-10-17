import Link from "next/link";
import { Compass } from "lucide-react";
import { primaryButton } from "@/shared/ui/button";
import { Logo } from "@/shared/ui/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-panel px-4 py-6 sm:px-10">
      <header>
        <Link href="/" aria-label="PestLaunch home" className="inline-flex">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center py-16">
        <section className="flex w-full max-w-md flex-col items-center rounded-[28px] bg-card px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Compass className="size-6" aria-hidden />
          </span>
          <p className="mt-6 text-sm font-medium text-accent">404</p>
          <h1 className="mt-1 text-2xl font-medium">Page not found</h1>
          <p className="mt-2 max-w-xs text-sm text-muted">
            This page doesn&apos;t exist, or it belongs to a company you&apos;re not part of.
          </p>
          <Link href="/" className={`${primaryButton} mt-8`}>
            Back to PestLaunch
          </Link>
        </section>
      </main>
    </div>
  );
}
