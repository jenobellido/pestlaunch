import { Phone } from "lucide-react";
import { PageHeader, PageStack } from "@/shared/ui/page-header";
import { listCalls } from "../server/call-repository";
import { CallList } from "./call-list";
import { UploadCallForm } from "./upload-call-form";

export async function CallsPage({ tenantSlug }: { tenantSlug: string }) {
  const calls = await listCalls(tenantSlug);
  return (
    <PageStack>
      <PageHeader
        title="Calls"
        description="Upload a recording to get its transcript, outcome, score and coaching."
        icon={Phone}
      />
      <UploadCallForm tenantSlug={tenantSlug} />
      <CallList tenantSlug={tenantSlug} calls={calls} />
    </PageStack>
  );
}
