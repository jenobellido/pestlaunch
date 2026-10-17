import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/core/auth";
import { listUserTenants } from "@/core/tenancy";
import { siteConfig } from "@/shared/config/site";
import { primaryButton, secondaryButton } from "@/shared/ui/button";
import { Logo } from "@/shared/ui/logo";

/** Signed-in users go straight to their company; everyone else sees the landing page. */
async function RedirectSignedIn() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [first] = await listUserTenants(user.id);
  redirect(first ? `/${first.slug}` : "/onboarding");
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-panel px-4 py-6 sm:px-10">
      <Suspense fallback={null}>
        <RedirectSignedIn />
      </Suspense>
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/login" className={secondaryButton}>
          Log in
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 py-24 text-center">
        <h1 className="text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
          Every call, scored. <span className="text-accent">Every rep, coached.</span>
        </h1>
        <p className="max-w-lg text-lg text-muted">{siteConfig.description}</p>
        <Link href="/signup" className={`${primaryButton} h-12 px-6`}>
          Get started
        </Link>
      </main>
    </div>
  );
}
