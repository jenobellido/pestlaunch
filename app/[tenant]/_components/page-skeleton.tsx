import { Bone } from "@/shared/ui/page-header";

/** Fallback shown while a tenant page checks access and loads its data. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="flex items-center gap-4">
        <Bone className="size-12 rounded-2xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-40 rounded-full" />
          <Bone className="h-4 w-64 rounded-full" />
        </div>
      </div>
      <section className="overflow-hidden rounded-[28px] bg-card">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line px-6 py-4 last:border-b-0">
            <Bone className="size-10 shrink-0 rounded-xl bg-card-2" />
            <div className="flex flex-col gap-2">
              <Bone className="h-3.5 w-48 rounded-full bg-card-2" />
              <Bone className="h-3 w-28 rounded-full bg-card-2" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
