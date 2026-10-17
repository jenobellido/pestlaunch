import { cn } from "@/shared/lib/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Module icon, shown in a tile before the title. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Buttons on the right. */
  actions?: React.ReactNode;
  className?: string;
}

/** The title block at the top of every workspace page, so all pages line up the same way. */
export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex min-h-12 flex-wrap items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-4">
        {Icon && (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card text-accent">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-medium">{title}</h1>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}

/** Vertical rhythm for a workspace page: header, then content, always 24px apart. */
export function PageStack({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

/** A pulsing placeholder block, the building piece of every skeleton. */
export function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse bg-card", className)} style={style} aria-hidden />;
}
