"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, FileAudio, Upload, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { primaryButton, Spinner } from "@/shared/ui/button";
import { MAX_RECORDING_BYTES, RECORDING_EXTENSIONS } from "@/core/storage/config";
import { uploadRecordingWithToken } from "@/core/storage/client";
import { formatDuration } from "./call-status";

type Stage = "idle" | "uploading" | "processing";
type Result = { tone: "success" | "error"; message: string; callId?: string };

const MAX_MB = MAX_RECORDING_BYTES / 1024 / 1024;

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Why a file can't be uploaded, checked before anything is sent. Matches the API's checks. */
function problemWith(file: File) {
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  if (!(RECORDING_EXTENSIONS as readonly string[]).includes(extension)) {
    return "That isn't an audio file. Upload an MP3, WAV or M4A recording.";
  }
  if (file.size > MAX_RECORDING_BYTES) return `That file is ${formatSize(file.size)}. Recordings can be up to ${MAX_MB} MB.`;
  if (file.size === 0) return "That file is empty.";
  return null;
}

/** Seconds since `active` turned true, ticking once a second. */
function useElapsed(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      clearInterval(timer);
      setElapsed(0);
    };
  }, [active]);
  return elapsed;
}

function Step({ state, label, detail }: { state: "done" | "active" | "waiting"; label: string; detail?: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          state === "done" && "bg-accent text-accent-ink",
          state === "active" && "bg-accent/15 text-accent",
          state === "waiting" && "bg-chip text-muted",
        )}
      >
        {state === "done" ? (
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        ) : state === "active" ? (
          <Spinner className="size-3.5 border-[1.5px]" />
        ) : (
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
        )}
      </span>
      <span className={cn("text-sm", state === "waiting" ? "text-muted" : "font-medium")}>{label}</span>
      {detail && <span className="ml-auto text-xs text-muted tabular-nums">{detail}</span>}
    </li>
  );
}

/** A team member a call can be assigned to. */
export interface AssignableMember {
  id: string;
  name: string;
}

/**
 * `members` is passed only to people allowed to assign calls: they choose whose call it is.
 * Everyone else's uploads are theirs, decided on the server.
 */
export function UploadCallForm({
  tenantSlug,
  members,
  callTypes,
}: {
  tenantSlug: string;
  members?: AssignableMember[];
  /** Passed when the company asks uploaders to pick the call type ("Ask on upload"). */
  callTypes?: { key: string; name: string }[];
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [callType, setCallType] = useState("");
  const typeSelectId = useId();
  const employeeSelectId = useId();
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  // Several recordings can be queued; they upload one at a time and each processes on its own.
  const [files, setFiles] = useState<File[]>([]);
  const [current, setCurrent] = useState(0);
  const file = files[current] ?? files[0] ?? null;
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const pending = stage !== "idle";
  const elapsed = useElapsed(stage === "processing");

  // Processing runs in the request; leaving now would drop an upload that hasn't reached the server.
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  // While a call processes, refresh the list so it shows up there as "Processing".
  useEffect(() => {
    if (stage !== "processing") return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [stage, router]);

  function choose(list: FileList | File[] | null) {
    setResult(null);
    const picked = Array.from(list ?? []);
    if (picked.length === 0) return clear();
    const valid = picked.filter((f) => !problemWith(f));
    const rejected = picked.filter((f) => problemWith(f));
    setFiles(valid);
    setCurrent(0);
    if (valid.length === 0 && inputRef.current) inputRef.current.value = "";
    if (rejected.length === 1) {
      setResult({ tone: "error", message: `${rejected[0].name}: ${problemWith(rejected[0])}` });
    } else if (rejected.length > 1) {
      setResult({ tone: "error", message: `${rejected.length} files were skipped because they aren't audio or are too large.` });
    }
  }

  function clear() {
    setFiles([]);
    setCurrent(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function api<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`/api/${tenantSlug}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(json.error ?? json.data?.error ?? "Something went wrong. Try again.");
      // A call that failed processing still exists; link to it.
      throw Object.assign(error, { callId: json.data?.id as string | undefined });
    }
    return json.data as T;
  }

  /** Uploads one recording and starts its processing; returns the new call's id. */
  async function send(next: File) {
    // The recording goes straight to private storage; the API only gets its path.
    setStage("uploading");
    const upload = await api<{ path: string; token: string }>("/calls/uploads", { fileName: next.name, size: next.size });
    await uploadRecordingWithToken(upload.path, upload.token, next);
    setStage("processing");
    const call = await api<{ id: string; status: string }>("/calls", {
      path: upload.path,
      fileName: next.name,
      ...(members ? { employeeId: employeeId || null } : {}),
      ...(callTypes ? { callType: callType || null } : {}),
    });
    return call;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (files.length === 0 || pending) return;
    setResult(null);
    const queue = [...files];
    const failed: { name: string; error: string; callId?: string }[] = [];
    let lastCallId: string | undefined;
    for (const [i, next] of queue.entries()) {
      setCurrent(i);
      try {
        lastCallId = (await send(next)).id;
      } catch (err) {
        failed.push({
          name: next.name,
          error: err instanceof Error ? err.message : "Processing failed.",
          callId: (err as { callId?: string }).callId,
        });
      }
      router.refresh();
    }

    // With background processing, calls come back still processing and fill in later.
    const sent = queue.length - failed.length;
    if (queue.length === 1) {
      setResult(
        failed.length
          ? { tone: "error", message: failed[0].error, callId: failed[0].callId }
          : { tone: "success", message: `${queue[0].name} is uploaded and processing.`, callId: lastCallId },
      );
    } else if (failed.length === 0) {
      setResult({ tone: "success", message: `All ${sent} recordings are uploaded and processing. They appear below as they finish.` });
    } else {
      setResult({
        tone: "error",
        message: `${sent} of ${queue.length} uploaded. Not uploaded: ${failed.map((f) => `${f.name} (${f.error})`).join("; ")}`,
      });
    }
    clear();
    setStage("idle");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[28px] bg-card p-5 sm:p-6" aria-busy={pending}>
      {pending && file ? (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-10" role="status" aria-live="polite">
          <div className="flex min-w-0 items-center gap-4 lg:w-80 lg:shrink-0">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <FileAudio className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{file.name}</span>
              <span className="block text-xs text-muted">
                {files.length > 1 ? `Recording ${current + 1} of ${files.length}. ` : ""}Keep this tab open until it&apos;s uploaded.
              </span>
            </span>
          </div>
          <ol className="flex flex-1 flex-col gap-3">
            <Step state={stage === "uploading" ? "active" : "done"} label="Upload recording" detail={formatSize(file.size)} />
            <Step
              state={stage === "processing" ? "active" : "waiting"}
              label="Transcribe, analyze and score"
              detail={stage === "processing" ? formatDuration(elapsed) : undefined}
            />
          </ol>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files);
            }}
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-2xl border border-dashed px-4 py-3.5 transition-colors has-focus-visible:border-accent has-focus-visible:ring-4 has-focus-visible:ring-accent/15",
              dragging ? "border-accent bg-accent/10" : "border-line-strong hover:border-accent hover:bg-accent/5",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              {file ? <FileAudio className="size-[18px]" aria-hidden /> : <Upload className="size-[18px]" aria-hidden />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {files.length > 1 ? (
                  `${files.length} recordings selected`
                ) : file ? (
                  file.name
                ) : dragging ? (
                  "Drop to add the recording"
                ) : (
                  <>
                    <span className="sm:hidden">Choose call recordings</span>
                    <span className="hidden sm:inline">Drop call recordings, or choose files</span>
                  </>
                )}
              </span>
              <span className="block text-xs text-muted">
                {file
                  ? formatSize(files.reduce((sum, f) => sum + f.size, 0))
                  : `MP3, WAV or M4A, up to ${MAX_MB} MB each. Several at once is fine.`}
              </span>
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              name="recording"
              accept={`audio/*,${RECORDING_EXTENSIONS.join(",")}`}
              className="sr-only"
              multiple
              onChange={(e) => choose(e.target.files)}
            />
          </label>
          {file && (
            <button
              type="button"
              onClick={clear}
              aria-label="Remove file"
              className="press hidden size-12 shrink-0 items-center justify-center self-center rounded-full text-muted hover:bg-card-2 hover:text-fg sm:flex"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
          {members && (
            <label htmlFor={employeeSelectId} className="flex flex-col justify-center gap-1 sm:w-56">
              <span className="text-xs text-muted">Whose call?</span>
              <select
                id={employeeSelectId}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="h-10 w-full rounded-xl border border-line bg-card px-3 text-sm outline-none transition-colors hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
              >
                <option value="">Work it out from the call</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {callTypes && (
            <label htmlFor={typeSelectId} className="flex flex-col justify-center gap-1 sm:w-56">
              <span className="text-xs text-muted">Call type</span>
              <select
                id={typeSelectId}
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
                className="h-10 w-full rounded-xl border border-line bg-card px-3 text-sm outline-none transition-colors hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
              >
                <option value="">Let the AI decide</option>
                {callTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" disabled={!file} className={cn(primaryButton, "h-12 px-6 disabled:cursor-not-allowed disabled:opacity-50")}>
            {files.length > 1 ? `Process ${files.length} calls` : "Process call"}
          </button>
        </div>
      )}

      {result && !pending && (
        <div
          role={result.tone === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 text-sm",
            result.tone === "error"
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-accent/30 bg-accent/10 text-accent",
          )}
        >
          <span className="flex items-center gap-2">
            {result.tone === "success" && <Check className="size-4 shrink-0" aria-hidden />}
            {result.message}
          </span>
          {result.callId && (
            <Link
              href={`/${tenantSlug}/calls/${result.callId}`}
              className="flex items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              Open call
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </form>
  );
}
