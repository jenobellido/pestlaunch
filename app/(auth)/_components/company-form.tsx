"use client";

import { useActionState } from "react";
import { createCompany, type FormState } from "@/core/auth/actions";
import { Field, FormError, SubmitButton } from "./form-fields";

export function CompanyForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCompany, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Company name" name="companyName" autoComplete="organization" defaultValue={state.values?.companyName} />
      <FormError message={state.error} />
      <SubmitButton pending={pending}>{pending ? "Creating…" : "Continue"}</SubmitButton>
    </form>
  );
}
