"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createTenantForOwner } from "@/core/tenancy";
import { requireUser } from "./session";
import { createSupabaseServerClient } from "./supabase-server";

export interface FormState {
  error?: string;
  /** Echo submitted values back so the form keeps them after an error. */
  values?: Record<string, string>;
}

const credentials = {
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
};
const companyName = z.string().trim().min(2, "Enter your company name.").max(80);

/** Only same-site paths, so a crafted ?next= can't redirect off-site. */
function safeNextPath(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

function formValues(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = z.object(credentials).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Incorrect email or password.", values };

  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["fullName", "companyName", "email"]);
  const parsed = z
    .object({ ...credentials, fullName: z.string().trim().min(1, "Enter your name."), companyName })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const { email, password, fullName } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error || !data.user) return { error: error?.message ?? "Could not create account.", values };

  // Supabase returns a user with no identities when the email is already registered.
  if (data.user.identities?.length === 0) {
    return { error: "An account with this email already exists. Log in instead.", values };
  }

  const tenant = await createTenantForOwner(parsed.data.companyName, data.user.id);

  // With email confirmation on (production default) there is no session yet.
  if (!data.session) redirect("/login?confirm=1");
  redirect(`/${tenant.slug}`);
}

export async function createCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, ["companyName"]);
  const parsed = companyName.safeParse(formData.get("companyName"));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const tenant = await createTenantForOwner(parsed.data, user.id);
  redirect(`/${tenant.slug}`);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
