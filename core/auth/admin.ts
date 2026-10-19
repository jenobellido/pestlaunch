import "server-only";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/core/config/env";

// Server-only Supabase admin access (secret key), used for example data: placeholder people who
// appear on a company's team but can never sign in.

function admin() {
  return createClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.admin;
}

/** Addresses on the reserved .invalid domain: no email is ever sent, and the account is easy to spot. */
export const PLACEHOLDER_DOMAIN = "example.invalid";
export const isPlaceholderEmail = (email: string) => email.toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`);

/**
 * Creates a user nobody can sign in as: a long random password that's never stored or shown, an
 * address that can't receive email, and no confirmation email sent.
 */
export async function createPlaceholderUser(email: string, fullName: string): Promise<string> {
  if (!isPlaceholderEmail(email)) throw new Error("Placeholder users must use the example.invalid domain.");
  const { data, error } = await admin().createUser({
    email,
    password: randomBytes(32).toString("base64url"),
    email_confirm: true,
    user_metadata: { full_name: fullName, placeholder: true },
  });
  if (error || !data.user) throw new Error(`Could not create ${fullName}: ${error?.message ?? "unknown error"}`);
  return data.user.id;
}

/** Deletes a placeholder user; refuses anyone else, so a real account can never be removed this way. */
export async function deletePlaceholderUser(userId: string, email: string) {
  if (!isPlaceholderEmail(email)) throw new Error("Only placeholder users can be deleted here.");
  const { error } = await admin().deleteUser(userId);
  if (error) throw new Error(`Could not remove ${email}: ${error.message}`);
}
