"use client";

import { useId, useState, useTransition } from "react";
import { AlertTriangle, BadgeCheck, Check, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { primaryButton, secondaryButton, Spinner } from "@/shared/ui/button";
import { correctScoreItem, reviewCall, type ReviewResult } from "../review-actions";

const CALL_TYPES = [
  ["new_customer", "New customer"],
  ["scheduling", "Scheduling"],
  ["billing", "Billing"],
  ["reservice", "Re-service"],
  ["retention", "Retention"],
  ["other", "Other"],
] as const;

const OUTCOMES = [
  ["booked", "Booked"],
  ["retained", "Saved"],
  ["cancelled", "Cancelled"],
  ["resolved", "Resolved"],
  ["follow_up_needed", "Follow-up needed"],
  ["unresolved", "Unresolved"],
] as const;

const field =
  "h-10 w-full rounded-xl border border-line bg-card px-3 text-sm outline-none transition-colors hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15";

export interface ReviewInfo {
  reviewerName: string;
  reviewedAt: string;
  note: string | null;
  changes: string[];
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Lets someone with "calls.review" check the AI's results and correct them. */
export function ReviewPanel({
  slug,
  callId,
  callType,
  resolution,
  flags,
  review,
}: {
  slug: string;
  callId: string;
  callType: string | null;
  resolution: string | null;
  flags: string[];
  review: ReviewInfo | null;
}) {
  const [editing, setEditing] = useState(!review);
  const [type, setType] = useState(callType ?? "other");
  const [outcome, setOutcome] = useState(resolution ?? "");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const typeId = useId();
  const outcomeId = useId();
  const noteId = useId();

  function save() {
    setMessage(null);
    start(async () => {
      const result: ReviewResult = await reviewCall(slug, callId, { callType: type, resolution: outcome || null, note });
      if (result.ok) {
        setMessage({ tone: "info", text: result.message });
        setNote("");
        setEditing(false);
      } else setMessage({ tone: "error", text: result.error });
    });
  }

  return (
    <section className="rounded-[28px] bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        {review ? (
          <BadgeCheck className="size-5 text-success" aria-hidden />
        ) : flags.length ? (
          <AlertTriangle className="size-5 text-orange" aria-hidden />
        ) : (
          <BadgeCheck className="size-5 text-muted" aria-hidden />
        )}
        <h2 className="text-[15px] font-medium">{review ? "Reviewed" : flags.length ? "Needs review" : "Review"}</h2>
        {review && (
          <span className="ml-auto text-xs text-muted">
            {review.reviewerName} · {formatWhen(review.reviewedAt)}
          </span>
        )}
      </div>

      {!review && flags.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm text-fg/85">
          {flags.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-orange" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
      )}
      {!review && flags.length === 0 && (
        <p className="mt-2 text-sm text-muted">Check the AI&apos;s results. Correct anything that&apos;s wrong, or mark it reviewed.</p>
      )}

      {review && (review.changes.length > 0 || review.note) && (
        <div className="mt-3 space-y-2 text-sm">
          {review.changes.length > 0 && (
            <ul className="space-y-1 text-fg/85">
              {review.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          {review.note && <p className="rounded-xl bg-chip px-3 py-2 text-muted">&ldquo;{review.note}&rdquo;</p>}
        </div>
      )}

      {editing ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label htmlFor={typeId} className="space-y-1.5">
              <span className="text-xs text-muted">Call type</span>
              <select id={typeId} value={type} onChange={(e) => setType(e.target.value)} className={field}>
                {CALL_TYPES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={outcomeId} className="space-y-1.5">
              <span className="text-xs text-muted">Outcome</span>
              <select id={outcomeId} value={outcome} onChange={(e) => setOutcome(e.target.value)} className={field}>
                {!resolution && <option value="">Not set</option>}
                {OUTCOMES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label htmlFor={noteId} className="block space-y-1.5">
            <span className="text-xs text-muted">Note (optional)</span>
            <textarea
              id={noteId}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Customer actually booked by text afterwards"
              className={cn(field, "h-auto resize-none py-2 leading-relaxed")}
            />
          </label>
          <p className="text-xs text-muted">To fix a single scorecard step, use the check or cross next to it in the score.</p>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={pending} className={cn(primaryButton, "h-10 px-4")}>
              {pending && <Spinner className="size-4" />}
              Save review
            </button>
            {review && (
              <button type="button" onClick={() => setEditing(false)} className={cn(secondaryButton, "h-10 px-4")}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className={cn(secondaryButton, "mt-4 h-9 px-4")}>
          Edit review
        </button>
      )}

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={cn("mt-3 text-sm", message.tone === "error" ? "text-danger" : "text-success")}>
          {message.text}
        </p>
      )}
    </section>
  );
}

/** The pass/fail mark on a scorecard step, clickable for reviewers to correct it. */
export function ScoreItemToggle({
  slug,
  callId,
  index,
  passed,
  name,
}: {
  slug: string;
  callId: string;
  index: number;
  passed: boolean;
  name: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <button
      type="button"
      disabled={pending}
      title={error ?? (passed ? `Mark "${name}" as missed` : `Mark "${name}" as passed`)}
      aria-label={passed ? `${name}: passed. Mark as missed` : `${name}: missed. Mark as passed`}
      onClick={() =>
        start(async () => {
          const result = await correctScoreItem(slug, callId, index, !passed);
          setError(result.ok ? null : result.error);
        })
      }
      className={cn(
        "press mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-card-2",
        error && "ring-2 ring-danger",
      )}
    >
      {pending ? (
        <Spinner className="size-3" />
      ) : passed ? (
        <Check className="size-4 text-success" aria-hidden />
      ) : (
        <X className="size-4 text-danger" aria-hidden />
      )}
    </button>
  );
}
