"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { secondaryButton, Spinner } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";

/** Deletes a call and its recording, after a confirm dialog. Owners and managers only (the API checks too). */
export function DeleteCallButton({ tenantSlug, callId, title }: { tenantSlug: string; callId: string; title: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/${tenantSlug}/calls/${callId}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      router.push(`/${tenantSlug}/calls`);
      router.refresh();
      return;
    }
    const json = await res?.json().catch(() => ({}));
    setError(json?.error ?? "The call couldn't be deleted. Try again.");
    setPending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          dialog.current?.showModal();
        }}
        aria-label="Delete call"
        title="Delete call"
        className="press flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-4 focus-visible:ring-danger/20 focus-visible:outline-none"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`${callId}-delete-title`}
        onClose={() => setPending(false)}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[28px] bg-card p-6 text-fg shadow-[0_24px_64px_-24px_rgb(0_0_0/0.5)] backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <Trash2 className="size-5" aria-hidden />
        </span>
        <h2 id={`${callId}-delete-title`} className="mt-5 text-lg font-medium">
          Delete this call?
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          <span className="font-medium text-fg">{title}</span> and its recording, transcript and score are removed for
          good.
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => dialog.current?.close()} className={cn(secondaryButton, "hover:bg-card-2")} autoFocus>
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="press inline-flex h-11 items-center justify-center gap-2 rounded-full bg-danger px-5 text-sm font-medium text-bg hover:brightness-110 focus-visible:ring-4 focus-visible:ring-danger/25 focus-visible:outline-none disabled:cursor-wait disabled:opacity-80"
          >
            {pending && <Spinner className="size-4" />}
            Delete call
          </button>
        </div>
      </dialog>
    </>
  );
}
