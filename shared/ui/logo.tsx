import { cn } from "@/shared/lib/cn";

/** The PestLaunch mark: a sound wave, for calls turned into insight. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9", className)} aria-hidden>
      <rect width="48" height="48" rx="14" fill="var(--accent)" />
      <rect x="11" y="20" width="5" height="8" rx="2.5" fill="var(--accent-ink)" opacity="0.5" />
      <rect x="18.5" y="13" width="5" height="22" rx="2.5" fill="var(--accent-ink)" />
      <rect x="26" y="17" width="5" height="14" rx="2.5" fill="var(--accent-ink)" opacity="0.75" />
      <rect x="33.5" y="21" width="5" height="6" rx="2.5" fill="var(--accent-ink)" opacity="0.5" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-xl font-medium tracking-tight">pestlaunch</span>
    </span>
  );
}
