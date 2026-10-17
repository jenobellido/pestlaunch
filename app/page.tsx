import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/core/auth";
import { listUserTenants } from "@/core/tenancy";
import { siteConfig } from "@/shared/config/site";

/** Signed-in users go straight to their company; everyone else sees the landing page. */
async function RedirectSignedIn() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [first] = await listUserTenants(user.id);
  redirect(first ? `/${first.slug}` : "/onboarding");
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <Suspense fallback={null}>
        <RedirectSignedIn />
      </Suspense>
      <h1 className="text-3xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{siteConfig.description}</p>
      <div className="flex gap-3 text-sm font-medium">
        <Link href="/signup" className="rounded-md bg-foreground px-4 py-2 text-background">
          Get started
        </Link>
        <Link href="/login" className="rounded-md border border-black/15 px-4 py-2 dark:border-white/20">
          Log in
        </Link>
      </div>
    </main>
  );
}
