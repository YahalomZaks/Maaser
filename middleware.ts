import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  checkRouteAccess,
  isAuthenticated,
  getUserRole,
} from "@/lib/auth-utils";
import { logPageViewMiddleware } from "@/lib/logging-middleware";

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  try {
    // Get session from request
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    const isLoggedIn = isAuthenticated(session);
    const userRole = getUserRole(session);

    // Check route access
    const redirectUrl = checkRouteAccess(
      nextUrl.pathname,
      userRole,
      isLoggedIn
    );

    if (redirectUrl) {
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // Log page views for authenticated users (async, non-blocking)
    if (isLoggedIn) {
      logPageViewMiddleware(req).catch((error) => {
        console.error("Page view logging failed:", error);
      });
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);

    // If there's an error and route is protected, redirect to signin
    const protectedRoutes = [
      "/dashboard",
      "/income",
      "/donations",
      "/settings",
      "/admin",
    ];
    const isProtectedRoute = protectedRoutes.some((route) =>
      nextUrl.pathname.startsWith(route)
    );

    if (isProtectedRoute) {
      const signInUrl = new URL("/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
