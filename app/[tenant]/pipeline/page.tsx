import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, SquareKanban } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { EmptyState } from "@/shared/ui/card";
import { Bone, PageHeader, PageStack } from "@/shared/ui/page-header";
import { callScope, LEAD_STAGES, listLeads, type Lead } from "@/modules/calls/server";
import { requireModule } from "../_lib/require-module";
import { StageSelect } from "./_components/stage-select";

const STAGE_DOT = { new: "bg-sky", contacted: "bg-orange", booked: "bg-success", lost: "bg-danger" } as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LeadCard({ slug, lead }: { slug: string; lead: Lead }) {
  return (
    <li className="rounded-2xl border border-line bg-card-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{lead.customerName ?? "Unknown caller"}</p>
          {lead.need && <p className="truncate text-xs text-muted first-letter:uppercase">{lead.need}</p>}
        </div>
        <Link
          href={`/${slug}/calls/${lead.callId}`}
          aria-label={`Open the call for ${lead.customerName ?? "this lead"}`}
          className="press flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-card hover:text-fg"
        >
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
      {lead.priceQuoted && <p className="mt-2 text-xs text-fg/80">{lead.priceQuoted}</p>}
      {lead.stage !== "booked" && lead.followUp && (
        <p className="mt-2 line-clamp-2 text-xs text-muted">Next: {lead.followUp}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted">
          {[lead.repName, formatDate(lead.createdAt)].filter(Boolean).join(" · ")}
        </span>
        <StageSelect slug={slug} leadId={lead.id} stage={lead.stage} />
      </div>
    </li>
  );
}

async function Board({ params }: { params: PageProps<"/[tenant]/pipeline">["params"] }) {
  const { tenant, user, permissions } = await requireModule(params, "calls");
  const leads = await listLeads(tenant.slug, callScope({ userId: user.id, permissions }));

  if (leads.length === 0) {
    return (
      <EmptyState icon={SquareKanban} title="No leads yet" className="min-h-80">
        Every new-customer call becomes a lead here. Upload a sales call to start the pipeline.
      </EmptyState>
    );
  }

  const decided = leads.filter((l) => l.stage === "booked" || l.stage === "lost").length;
  const booked = leads.filter((l) => l.stage === "booked").length;
  return (
    <>
      <p className="text-sm text-muted">
        {leads.length} {leads.length === 1 ? "lead" : "leads"}
        {decided > 0 && ` · ${Math.round((booked / decided) * 100)}% of decided leads booked`}
      </p>
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LEAD_STAGES.map((stage) => {
          const column = leads.filter((l) => l.stage === stage.id);
          return (
            <section key={stage.id} aria-label={stage.label} className="rounded-[28px] bg-card p-3">
              <h2 className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium">
                <span className={cn("size-2 rounded-full", STAGE_DOT[stage.id])} aria-hidden />
                {stage.label}
                <span className="ml-auto rounded-full bg-chip px-2 py-0.5 text-xs tabular-nums text-muted">{column.length}</span>
              </h2>
              {column.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted">Nothing here.</p>
              ) : (
                <ul className="mt-1 space-y-2">
                  {column.map((lead) => (
                    <LeadCard key={lead.id} slug={tenant.slug} lead={lead} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

export default function PipelinePage({ params }: PageProps<"/[tenant]/pipeline">) {
  return (
    <PageStack>
      <PageHeader
        title="Pipeline"
        description="Every new-customer call as a lead. Move them along until they book."
        icon={SquareKanban}
      />
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <Bone key={i} className="h-72 rounded-[28px]" />
            ))}
          </div>
        }
      >
        <Board params={params} />
      </Suspense>
    </PageStack>
  );
}
