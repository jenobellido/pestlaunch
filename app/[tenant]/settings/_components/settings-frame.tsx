import { Settings } from "lucide-react";
import { Bone, PageHeader, PageStack } from "@/shared/ui/page-header";

export function SettingsHeader() {
  return <PageHeader title="Settings" description="Your profile, appearance and company." icon={Settings} />;
}

/** A settings section: title and explanation on the left, controls on the right. */
export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-5 rounded-[28px] bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10"
    >
      <div>
        <h2 id={id} className="text-[15px] font-medium">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** The four sections at roughly their real heights. */
export function SettingsBodySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {[136, 264, 168, 300].map((height, i) => (
        <Bone key={i} className="rounded-[28px]" style={{ height }} />
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <PageStack>
      <SettingsHeader />
      <SettingsBodySkeleton />
    </PageStack>
  );
}
