"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "../../_components/form-fields";
import { acceptInviteAction } from "./actions";

export function AcceptInviteButton({ token, companyName }: { token: string; companyName: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction.bind(null, token), {});
  return (
    <form action={action} className="grid gap-4">
      <FormError message={state.error} />
      <SubmitButton pending={pending}>{pending ? "Joining…" : `Join ${companyName}`}</SubmitButton>
    </form>
  );
}
