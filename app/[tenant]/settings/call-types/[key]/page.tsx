import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { countCallsOfType, getCallTypes } from "@/core/calls/server";
import { can, requireTenantAccess } from "@/core/tenancy";
import { SettingsPage } from "../../_components/settings-frame";
import { TypeEditor } from "../_components/type-editor";
import { toInput } from "../_lib/input";

export default async function EditCallTypePage({ params }: PageProps<"/[tenant]/settings/call-types/[key]">) {
  const { tenant: slug, key } = await params;
  const access = await requireTenantAccess(slug);
  if (!can(access, "calltypes.manage")) notFound();
  const type = (await getCallTypes(access.tenant.id)).find((t) => t.key === key);
  if (!type) notFound();
  const calls = await countCallsOfType(access.tenant.id, key);

  return (
    <SettingsPage>
      <Link href={`/${slug}/settings/call-types`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        Call types
      </Link>
      <TypeEditor
        slug={slug}
        typeKey={type.key}
        initial={toInput(type)}
        builtIn={type.builtIn}
        customized={type.customized}
        calls={calls}
        showAssistant={false}
      />
    </SettingsPage>
  );
}
