"use client";

import { useActionState } from "react";
import { Field, FormAlert, SavedNote, SubmitButton } from "@/shared/ui/form";
import type { FieldFormState } from "../actions";

/** A one-field settings form: the profile name or the company name. */
export function NameForm({
  action: saveAction,
  name,
  label,
  defaultValue,
  autoComplete,
  hint,
  submitLabel,
  children,
}: {
  action: (prev: FieldFormState, formData: FormData) => Promise<FieldFormState>;
  name: string;
  label: string;
  defaultValue: string;
  autoComplete?: string;
  hint?: string;
  submitLabel: string;
  /** Extra read-only rows under the field, e.g. the login email. */
  children?: React.ReactNode;
}) {
  const [state, action, pending] = useActionState(saveAction, { status: "idle" });
  const error = state.status === "error" ? state : undefined;

  return (
    <form action={action} noValidate className="grid gap-5">
      {error?.message && <FormAlert>{error.message}</FormAlert>}
      <Field
        submission={state}
        label={label}
        name={name}
        autoComplete={autoComplete}
        maxLength={80}
        required
        defaultValue={error?.value ?? defaultValue}
        error={error?.fieldError}
        hint={hint}
      />
      {children}
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
        {state.status === "saved" && !pending && <SavedNote />}
      </div>
    </form>
  );
}
