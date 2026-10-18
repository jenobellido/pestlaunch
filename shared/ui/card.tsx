import { cn } from "@/shared/lib/cn";

/**
 * A rounded panel. `flush` drops the padding for edge-to-edge lists (cn() doesn't merge
 * classes, so overriding the padding with a className would fight the default).
 */
export function Card({ className, flush = false, ...props }: React.ComponentProps<"section"> & { flush?: boolean }) {
  return <section className={cn("rounded-[28px] bg-card", !flush && "p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-[15px] font-medium", className)} {...props} />;
}

/** Neutral pill label. A coloured dot carries meaning; the text stays readable on any surface. */
export function Badge({
  dot,
  className,
  children,
}: {
  /** Background class for the dot, e.g. "bg-accent". */
  dot?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-fg/80",
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />}
      {children}
    </span>
  );
}

/** Centered message inside a card, for empty lists and pages that aren't built yet. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center rounded-[28px] bg-card px-6 py-16 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="mt-6 text-xl font-medium">{title}</h2>
      {children && <div className="mt-2 max-w-sm text-sm text-muted">{children}</div>}
    </section>
  );
}
