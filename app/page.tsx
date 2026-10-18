import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/core/auth";
import { listUserTenants } from "@/core/tenancy";
import { siteConfig } from "@/shared/config/site";
import { MotionProvider } from "@/shared/ui/motion";
import { Closing } from "./_landing/closing";
import { Features } from "./_landing/features";
import { Hero } from "./_landing/hero";
import { HowItWorks } from "./_landing/how-it-works";
import { Privacy } from "./_landing/privacy";
import { ProductPreview } from "./_landing/product-preview";
import { Questions } from "./_landing/questions";
import { SiteFooter } from "./_landing/site-footer";
import { SiteHeader } from "./_landing/site-header";

export const metadata: Metadata = {
  title: `${siteConfig.name}: every call scored, every rep coached`,
  description: siteConfig.description,
};

/** Signed-in users go straight to their company; everyone else sees the landing page. */
async function RedirectSignedIn() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [first] = await listUserTenants(user.id);
  redirect(first ? `/${first.slug}` : "/onboarding");
}

export default function Home() {
  return (
    <MotionProvider>
      <Suspense fallback={null}>
        <RedirectSignedIn />
      </Suspense>
      <div className="flex-1 bg-bg">
        <SiteHeader />
        <main>
          <Hero />
          <ProductPreview />
          <Questions />
          <HowItWorks />
          <Features />
          <Privacy />
          <Closing />
        </main>
        <SiteFooter />
      </div>
    </MotionProvider>
  );
}
