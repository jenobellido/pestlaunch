"use client";

import { useActionState } from "react";
import { signUp, type FormState } from "@/core/auth/actions";
import { Field, FormError, SubmitButton } from "./form-fields";

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-5">
      <Field label="Your name" name="fullName" autoComplete="name" defaultValue={v.fullName} />
      <Field label="Company name" name="companyName" autoComplete="organization" defaultValue={v.companyName} />
      <Field label="Work email" name="email" type="email" autoComplete="email" defaultValue={v.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" />
      <FormError message={state.error} />
      <SubmitButton pending={pending}>{pending ? "Creating account…" : "Create account"}</SubmitButton>
    </form>
  );
}
