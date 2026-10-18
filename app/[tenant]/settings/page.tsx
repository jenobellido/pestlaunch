import { requireTenantAccess } from "@/core/tenancy";
import { Field } from "@/shared/ui/form";
import { updateProfile } from "./actions";
import { NameForm } from "./_components/name-form";
import { SettingsPage, SettingsSection } from "./_components/settings-frame";

export default async function ProfileSettingsPage({ params }: PageProps<"/[tenant]/settings">) {
  const { tenant: slug } = await params;
  const { user, role } = await requireTenantAccess(slug);

  return (
    <SettingsPage>
      <SettingsSection id="settings-profile" title="Profile" description="How you appear to your team.">
        <NameForm
          action={updateProfile}
          name="fullName"
          label="Display name"
          autoComplete="name"
          defaultValue={user.name ?? ""}
          submitLabel="Save profile"
        >
          <Field label="Email" type="email" value={user.email} readOnly hint="Your login email." />
          <Field label="Role" value={role.name} readOnly hint="Set by whoever manages your team." />
        </NameForm>
      </SettingsSection>
    </SettingsPage>
  );
}
