"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { primaryButton, Spinner } from "@/shared/ui/button";
import { uploadRecordingWithToken } from "@/core/storage/client";

export function UploadCallForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const inputId = useId();
  const [stage, setStage] = useState<"idle" | "uploading" | "processing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const pending = stage !== "idle";

  async function api<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`/api/${tenantSlug}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? json.data?.error ?? "Something went wrong. Try again.");
    return json.data as T;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = new FormData(e.currentTarget).get("recording");
    if (!(file instanceof File) || file.size === 0) return;
    setError(null);
    try {
      // The recording goes straight to private storage; the API only gets its path.
      setStage("uploading");
      const upload = await api<{ path: string; token: string }>("/calls/uploads", {
        fileName: file.name,
        size: file.size,
      });
      await uploadRecordingWithToken(upload.path, upload.token, file);

      setStage("processing");
      await api("/calls", { path: upload.path, fileName: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    }
    setStage("idle");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[28px] bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label
          htmlFor={inputId}
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-line-strong px-4 py-3.5 transition-colors hover:border-accent hover:bg-accent/5 has-focus-visible:border-accent has-focus-visible:ring-4 has-focus-visible:ring-accent/15",
            pending && "pointer-events-none opacity-60",
          )}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Upload className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{fileName ?? "Choose a call recording"}</span>
            <span className="block text-xs text-muted">MP3, WAV or M4A</span>
          </span>
          <input
            id={inputId}
            type="file"
            name="recording"
            accept="audio/*"
            required
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <button type="submit" disabled={pending} aria-disabled={pending} className={cn(primaryButton, "h-12 px-6")}>
          {pending && <Spinner className="size-4" />}
          {stage === "uploading" ? "Uploading…" : stage === "processing" ? "Processing…" : "Process call"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
