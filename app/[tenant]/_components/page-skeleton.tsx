/** Fallback shown while a tenant page checks access and loads its data. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="mb-6 h-7 w-48 rounded bg-black/10 dark:bg-white/10" />
      <div className="flex flex-col gap-3">
        <div className="h-4 w-full max-w-lg rounded bg-black/5 dark:bg-white/5" />
        <div className="h-4 w-full max-w-md rounded bg-black/5 dark:bg-white/5" />
        <div className="h-4 w-full max-w-sm rounded bg-black/5 dark:bg-white/5" />
      </div>
    </div>
  );
}
