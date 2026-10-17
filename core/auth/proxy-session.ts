import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request and returns the
 * signed-in user id (or null). Must run in the proxy, before rendering.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );

  // getClaims verifies the JWT and refreshes it when close to expiry.
  const { data } = await supabase.auth.getClaims();
  return { response, userId: (data?.claims.sub as string | undefined) ?? null };
}

/** Builds a redirect that keeps any refreshed auth cookies. */
export function redirectWithSession(session: NextResponse, url: URL) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of session.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
