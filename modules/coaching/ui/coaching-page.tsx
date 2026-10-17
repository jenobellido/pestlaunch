import { PageHeader } from "@/shared/ui/page-header";

export function CoachingPage({ tenantSlug }: { tenantSlug: string }) {
  return (
    <>
      <PageHeader title="Coaching" />
      <p className="text-zinc-500">Per-employee feedback and score trends for {tenantSlug} go here.</p>
    </>
  );
}
