import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Routes that require admin privileges
const ADMIN_ROUTES = [
  "/admin",
  "/admin/dashboard",
  "/admin/users",
  "/admin/logs",
  "/admin/analytics",
];

// Routes that require authentication (but not admin)
const PROTECTED_ROUTES = ["/dashboard", "/income", "/donations", "/settings"];

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    // Get session from request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Check if route requires admin privileges
    const isAdminRoute = ADMIN_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    // Check if route requires authentication
    const isProtectedRoute =
      PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) ||
      isAdminRoute;

    // If route requires authentication but user is not logged in
    if (isProtectedRoute && !session?.user) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // If route requires admin privileges but user is not admin
    if (isAdminRoute && session?.user?.role !== "ADMIN") {
      // Redirect regular users to dashboard with error message
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(dashboardUrl);
    }

    // If user is logged in but tries to access auth pages, redirect to dashboard
    if (session?.user && ["/signin", "/signup"].includes(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    // If there's an error and route is protected, redirect to signin
    const isProtectedRoute =
      PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) ||
      ADMIN_ROUTES.some((route) => pathname.startsWith(route));

    if (isProtectedRoute) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  }
}

// Helper function to check if user is admin (for use in components)
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    // This would typically query the database
    // For now, we'll implement this in a separate utility
    return false; // Will be implemented with database query
  } catch {
    return false;
  }
}
