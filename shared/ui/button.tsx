import { cn } from "@/shared/lib/cn";

/** Mint pill for the main action on a page. */
export const primaryButton =
  "press inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink hover:brightness-110 disabled:cursor-wait disabled:opacity-80";

/** Outlined pill for secondary actions. */
export const secondaryButton =
  "press inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm text-fg hover:bg-card";

/** A spinner sized for buttons, in the colour of the text it replaces. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("size-5 animate-spin rounded-full border-2 border-current/30 border-t-current", className)}
      aria-hidden
    />
  );
}
