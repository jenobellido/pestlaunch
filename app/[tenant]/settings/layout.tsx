import { Suspense } from "react";
import { Building2, Palette, ShieldCheck, UserRound, Users } from "lucide-react";
import { Bone, PageStack } from "@/shared/ui/page-header";
import { SettingsHeader } from "./_components/settings-frame";
import { SettingsNav } from "./_components/settings-nav";

async function Menu({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const base = `/${tenant}/settings`;
  // Icons are rendered here, on the server, so the client links get elements, not components.
  return (
    <SettingsNav
      items={[
        { href: base, label: "Profile", icon: <UserRound aria-hidden /> },
        { href: `${base}/appearance`, label: "Appearance", icon: <Palette aria-hidden /> },
        { href: `${base}/company`, label: "Company", icon: <Building2 aria-hidden /> },
        { href: `${base}/team`, label: "Team", icon: <Users aria-hidden /> },
        { href: `${base}/roles`, label: "Roles", icon: <ShieldCheck aria-hidden /> },
      ]}
    />
  );
}

function MenuSkeleton() {
  return (
    <div className="flex gap-1.5 rounded-full bg-card p-1.5 lg:flex-col lg:gap-2 lg:rounded-[28px]" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Bone key={i} className="h-10 w-24 shrink-0 rounded-full bg-card-2 lg:h-11 lg:w-full" />
      ))}
    </div>
  );
}

/** Settings is split into pages; the header and menu stay while you move between them. */
export default function SettingsLayout({ children, params }: LayoutProps<"/[tenant]/settings">) {
  return (
    <PageStack>
      <SettingsHeader />
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <Suspense fallback={<MenuSkeleton />}>
          <Menu params={params} />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
    </PageStack>
  );
}
