"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const controlClass =
  "h-12 w-full rounded-2xl border border-line bg-card px-4 text-[15px] text-fg outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15";

/** Labelled input. Password inputs get a show/hide toggle. */
export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
  readOnly,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  readOnly?: boolean;
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPassword && revealed ? "text" : type}
          required
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          readOnly={readOnly}
          className={cn(controlClass, isPassword && "pr-12")}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-1.5 my-auto flex size-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-card-2 hover:text-fg"
          >
            {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="press relative mt-1 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-medium text-accent-ink hover:brightness-110 disabled:cursor-wait disabled:opacity-80"
    >
      {children}
    </button>
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

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <FormAlert>{message}</FormAlert>;
}
