import type { NextRequest } from "next/server";
import { redirectWithSession, updateSession } from "@/core/auth/proxy-session";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);
const AUTH_PAGES = new Set(["/login", "/signup"]);

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // API routes answer 401 themselves instead of redirecting.
  if (pathname.startsWith("/api/")) return response;

  if (!userId && !PUBLIC_PATHS.has(pathname)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return redirectWithSession(response, url);
  }
  if (userId && AUTH_PAGES.has(pathname)) {
    return redirectWithSession(response, new URL("/", request.url));
  }
  return response;
}

export const config = {
  // Everything except static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
