import { notFound } from "next/navigation";
import { areasFor } from "../../_lib/areas";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { CALL_TYPE_GROUP_LABELS } from "@/core/calls";
import { countCallsByType, getCallTypeMode, getCallTypes } from "@/core/calls/server";
import { can, requireTenantAccess } from "@/core/tenancy";
import { cn } from "@/shared/lib/cn";
import { primaryButton, secondaryButton } from "@/shared/ui/button";
import { SettingsPage, SettingsSection } from "../_components/settings-frame";
import { ModePicker } from "./_components/mode-picker";
import { TypeList, type TypeRow } from "./_components/type-list";

export default async function CallTypesSettingsPage({ params }: PageProps<"/[tenant]/settings/call-types">) {
  const { tenant: slug } = await params;
  const access = await requireTenantAccess(slug);
  const canEdit = can(access, "calltypes.manage");
  // Company setup; everyone can still read the scorecards on "How calls are graded".
  if (!areasFor(access.permissions).settings.callTypes) notFound();
  const [types, mode, counts] = await Promise.all([
    getCallTypes(access.tenant.id),
    getCallTypeMode(access.tenant.id),
    countCallsByType(access.tenant.id),
  ]);

  const rows: TypeRow[] = types.map((t) => {
    const steps = t.scorecard?.sections.reduce((n, s) => n + s.items.length, 0) ?? 0;
    return {
      key: t.key,
      name: t.name,
      description: t.description,
      groupLabel: CALL_TYPE_GROUP_LABELS[t.group],
      scoring: t.scorecard ? `${t.scorecard.name} · ${steps} steps · Gold ${t.scorecard.thresholds.gold}` : "Not scored",
      enabled: t.enabled,
      tag: !t.builtIn ? "Custom" : t.customized ? "Edited" : "Default",
      calls: counts.get(t.key) ?? 0,
    };
  });
  const noPermission = canEdit ? "" : " Ask an owner to change these.";

  return (
    <SettingsPage>
      <SettingsSection
        id="settings-call-type-mode"
        title="How calls get their type"
        description={`The type decides which scorecard grades a call.${noPermission}`}
      >
        <ModePicker slug={slug} mode={mode} canEdit={canEdit} />
      </SettingsSection>

      <SettingsSection
        id="settings-call-types"
        title="Call types"
        description={`Each kind of call and how it's graded. The defaults come from the PestLaunch call manuals; change them or add your own.${noPermission}`}
      >
        <div className="grid gap-5">
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/${slug}/settings/call-types/new?assistant=1`} className={cn(primaryButton, "h-10")}>
                <Sparkles className="size-4" aria-hidden />
                Create with AI
              </Link>
              <Link href={`/${slug}/settings/call-types/new`} className={cn(secondaryButton, "h-10")}>
                <Plus className="size-4" aria-hidden />
                New call type
              </Link>
            </div>
          )}
          <TypeList slug={slug} rows={rows} canEdit={canEdit} />
        </div>
      </SettingsSection>
    </SettingsPage>
  );
}
