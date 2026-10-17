"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { secondaryButton, Spinner } from "@/shared/ui/button";

/** Runs a failed call through processing again. Keeps the transcript when there is one. */
export function RetryCallButton({ tenantSlug, callId }: { tenantSlug: string; callId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/${tenantSlug}/calls/${callId}/retry`, { method: "POST" }).catch(() => null);
    if (!res?.ok) {
      const json = await res?.json().catch(() => ({}));
      setError(json?.error ?? "The call couldn't be retried. Try again.");
    }
    setPending(false);
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={retry}
        disabled={pending}
        aria-disabled={pending}
        className={cn(secondaryButton, "h-9 border-danger/30 px-4 hover:bg-danger/10")}
      >
        {pending ? <Spinner className="size-4" /> : <RotateCw className="size-4" aria-hidden />}
        Retry processing
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
