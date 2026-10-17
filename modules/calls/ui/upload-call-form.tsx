"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UploadCallForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch(`/api/${tenantSlug}/calls`, {
      method: "POST",
      body: new FormData(e.currentTarget),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? body.data?.error ?? "Processing failed");
    }
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mb-8 flex items-center gap-3">
      <input type="file" name="recording" accept="audio/*" required className="text-sm" />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {pending ? "Processing…" : "Process call"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
