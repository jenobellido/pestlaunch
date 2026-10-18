import { Settings } from "lucide-react";
import { ViewTransition } from "react";
import { Bone, PageExit, PageHeader } from "@/shared/ui/page-header";

export function SettingsHeader() {
  return (
    <PageHeader
      title="Settings"
      description="Your profile and appearance, and how your company is set up."
      icon={Settings}
    />
  );
}

/** A settings section: title and explanation on the left, controls on the right (stacked on small screens). */
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
      className="grid gap-5 rounded-[28px] bg-card p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:gap-10"
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

/** One page's sections, 16px apart. Fades in when you switch settings pages; the menu stays put. */
export function SettingsPage({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div className="space-y-4">{children}</div>
    </ViewTransition>
  );
}

/** Shown in the content column while a settings page loads; the menu stays put. */
export function SettingsBodySkeleton() {
  return (
    <PageExit>
      <div className="space-y-4" aria-busy="true" aria-label="Loading">
        {[220, 160].map((height, i) => (
          <Bone key={i} className="rounded-[28px]" style={{ height }} />
        ))}
      </div>
    </PageExit>
  );
}
