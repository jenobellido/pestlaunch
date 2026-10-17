import { PageHeader } from "@/shared/ui/page-header";
import { listCalls } from "../server/call-repository";
import { CallList } from "./call-list";
import { UploadCallForm } from "./upload-call-form";

export async function CallsPage({ tenantSlug }: { tenantSlug: string }) {
  const calls = await listCalls(tenantSlug);
  return (
    <>
      <PageHeader title="Calls" />
      <UploadCallForm tenantSlug={tenantSlug} />
      <CallList tenantSlug={tenantSlug} calls={calls} />
    </>
  );
}
