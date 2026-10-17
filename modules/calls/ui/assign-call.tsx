"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { UserRound } from "lucide-react";
import { Spinner } from "@/shared/ui/button";
import type { AssignableMember } from "./upload-call-form";

/** Lets someone allowed to assign calls move this call to another team member. */
export function AssignCall({
  tenantSlug,
  callId,
  employeeId,
  members,
}: {
  tenantSlug: string;
  callId: string;
  employeeId: string | null;
  members: AssignableMember[];
}) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(employeeId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign(next: string) {
    const previous = value;
    setValue(next);
    setPending(true);
    setError(null);
    const res = await fetch(`/api/${tenantSlug}/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: next || null }),
    }).catch(() => null);
    if (!res?.ok) {
      const json = await res?.json().catch(() => ({}));
      setError(json?.error ?? "The call couldn't be reassigned.");
      setValue(previous);
    }
    setPending(false);
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <UserRound className="size-4" aria-hidden />
      <label htmlFor={id} className="sr-only">
        Whose call
      </label>
      <select
        id={id}
        value={value}
        disabled={pending}
        onChange={(e) => assign(e.target.value)}
        className="-my-1 h-8 rounded-lg border border-transparent bg-transparent px-1.5 text-sm text-fg outline-none transition-colors hover:border-line hover:bg-card focus:border-accent focus:ring-4 focus:ring-accent/15"
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {pending && <Spinner className="size-3.5" />}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
