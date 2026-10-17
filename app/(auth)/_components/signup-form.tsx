"use client";

import { useActionState } from "react";
import { signUp, type FormState } from "@/core/auth/actions";
import { Field, FormError, SubmitButton } from "./form-fields";

/** With an `invite`, the email is the invited one and no company is created. */
export function SignupForm({ invite }: { invite?: { token: string; email: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-5">
      {invite && <input type="hidden" name="invite" value={invite.token} />}
      <Field label="Your name" name="fullName" autoComplete="name" defaultValue={v.fullName} />
      {!invite && (
        <Field label="Company name" name="companyName" autoComplete="organization" defaultValue={v.companyName} />
      )}
      <Field
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={invite?.email ?? v.email}
        readOnly={!!invite}
      />
      <Field label="Password" name="password" type="password" autoComplete="new-password" />
      <FormError message={state.error} />
      <SubmitButton pending={pending}>
        {pending ? "Creating account…" : invite ? "Create account and join" : "Create account"}
      </SubmitButton>
    </form>
  );
}
