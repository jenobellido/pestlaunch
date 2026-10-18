import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { can, requireTenantAccess } from "@/core/tenancy";
import { SettingsPage } from "../../_components/settings-frame";
import { TypeEditor } from "../_components/type-editor";
import { blankInput } from "../_lib/input";

export default async function NewCallTypePage({ params, searchParams }: PageProps<"/[tenant]/settings/call-types/new">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug);
  if (!can(access, "calltypes.manage")) notFound();
  // "Create with AI" opens with the assistant first; "New call type" starts from a blank scorecard.
  const assistant = (await searchParams).assistant === "1";

  return (
    <SettingsPage>
      <Link href={`/${slug}/settings/call-types`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        Call types
      </Link>
      <TypeEditor slug={slug} typeKey={null} initial={blankInput()} builtIn={false} customized={false} calls={0} showAssistant={assistant} />
    </SettingsPage>
  );
}
