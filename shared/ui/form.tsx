"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const controlClass =
  "h-12 w-full rounded-2xl border border-line bg-card px-4 text-[15px] text-fg outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15 aria-invalid:border-danger aria-invalid:focus:ring-danger/15 read-only:cursor-default read-only:text-muted read-only:hover:border-line read-only:focus:border-line read-only:focus:ring-0";

/** Hides a server error once the user edits the field, and brings it back on the next submit. */
function useFieldError(serverError: string | undefined, submission: unknown) {
  const [edited, setEdited] = useState(false);
  const [lastSubmission, setLastSubmission] = useState(submission);
  if (submission !== lastSubmission) {
    setLastSubmission(submission);
    setEdited(false);
  }
  return { error: edited ? undefined : serverError, markEdited: () => setEdited(true) };
}

type FieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  /** The form's action state. A new submission re-shows errors the user had edited away. */
  submission?: unknown;
};

/** Labelled input with an inline error and an optional hint below it. */
export function Field({ label, error: serverError, hint, submission, className, onChange, ...props }: FieldProps) {
  const id = useId();
  const { error, markEdited } = useFieldError(serverError, submission);
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={controlClass}
        onChange={(e) => {
          markEdited();
          onChange?.(e);
        }}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "error" ? "border-danger/30 bg-danger/10 text-danger" : "border-accent/30 bg-accent/10 text-accent",
      )}
    >
      {children}
    </div>
  );
}

/** Mint submit pill that keeps its width and shows a spinner while the action runs. */
export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="press relative flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-ink hover:brightness-110 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none disabled:cursor-wait disabled:opacity-80"
    >
      <span className={cn("transition-opacity", pending && "opacity-0")}>{children}</span>
      {pending && (
        <span
          className="absolute size-5 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink"
          aria-hidden
        />
      )}
    </button>
  );
}

/** "Saved" next to a submit button after a successful save. */
export function SavedNote() {
  return (
    <span role="status" className="flex items-center gap-1.5 text-sm text-accent">
      <Check className="size-4" aria-hidden />
      Saved
    </span>
  );
}

/** An on/off switch. The label and description live in the row around it. */
export function Switch({
  checked,
  onChange,
  disabled,
  ...aria
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        // The off track needs 3:1 against the card, like any control boundary.
        checked ? "bg-accent" : "bg-muted/60",
      )}
      {...aria}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-card shadow-sm transition-transform duration-200",
          checked && "translate-x-4",
        )}
        aria-hidden
      />
    </button>
  );
}
