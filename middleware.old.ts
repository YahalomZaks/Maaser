import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  checkRouteAccess,
  isAuthenticated,
  getUserRole,
} from "@/lib/auth-utils";

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

  try {
    // Get session from request
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    const isLoggedIn = !!session?.user;
    const isAdminRoute = ADMIN_ROUTES.some((route) =>
      nextUrl.pathname.startsWith(route)
    );
    const isProtectedRoute =
      PROTECTED_ROUTES.some((route) => nextUrl.pathname.startsWith(route)) ||
      isAdminRoute;
    const isAuthRoute = AUTH_ROUTES.includes(nextUrl.pathname);

    // If route requires authentication but user is not logged in
    if (isProtectedRoute && !isLoggedIn) {
      const signInUrl = new URL("/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // If route requires admin privileges but user is not admin
    if (isAdminRoute && session?.user?.role !== "ADMIN") {
      const dashboardUrl = new URL("/dashboard", req.url);
      dashboardUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(dashboardUrl);
    }

    // If user is logged in but tries to access auth pages, redirect to dashboard
    if (isLoggedIn && isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);

    // If there's an error and route is protected, redirect to signin
    const isProtectedRoute =
      PROTECTED_ROUTES.some((route) => nextUrl.pathname.startsWith(route)) ||
      ADMIN_ROUTES.some((route) => nextUrl.pathname.startsWith(route));

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
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
