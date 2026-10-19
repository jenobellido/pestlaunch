import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/core/auth/supabase-server";

/**
 * Where the "confirm your email" link lands. Supabase verifies the address, then sends the
 * person here with a one-time code (or a token hash, depending on the email template); this
 * swaps it for a session and takes them into their company.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createSupabaseServerClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  // Signed in: the home page sends them on to their company. Otherwise, log in by hand.
  return NextResponse.redirect(new URL(error ? "/login?confirm=failed" : "/", origin));
}
