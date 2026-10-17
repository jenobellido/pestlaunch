import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/shared/ui/card";
import { PageHeader, PageStack } from "@/shared/ui/page-header";

export function CoachingPage({ tenantSlug }: { tenantSlug: string }) {
  return (
    <PageStack>
      <PageHeader
        title="Coaching"
        description="Feedback per employee, and how their scores trend over time."
        icon={MessageSquareText}
      />
      <EmptyState icon={MessageSquareText} title="Coaching trends are on the way" className="min-h-80">
        Per-employee feedback and score trends for {tenantSlug} go here.
      </EmptyState>
    </PageStack>
  );
}
