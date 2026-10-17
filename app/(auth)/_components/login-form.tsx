"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signIn, type FormState } from "@/core/auth/actions";
import { Field, FormError, SubmitButton } from "./form-fields";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  const next = useSearchParams().get("next") ?? "";
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <FormError message={state.error} />
      <SubmitButton pending={pending}>{pending ? "Logging in…" : "Log in"}</SubmitButton>
    </form>
  );
}
