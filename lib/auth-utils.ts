import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

/**
 * Get the current user session (for server components)
 */
export async function getCurrentSession(request?: NextRequest) {
  try {
    const headersList = request?.headers || (await headers());

    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(
  userRole: Role | undefined,
  requiredRole: Role
): boolean {
  if (!userRole) return false;

  // Admin has access to everything
  if (userRole === "ADMIN") return true;

  // Check exact role match
  return userRole === requiredRole;
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: Role | undefined): boolean {
  return userRole === "ADMIN";
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(session: any): boolean {
  return !!session?.user;
}

/**
 * Get user role from session
 */
export function getUserRole(session: any): Role | undefined {
  return session?.user?.role;
}

/**
 * Protected route checker - returns redirect URL if access denied
 */
export function checkRouteAccess(
  pathname: string,
  userRole: Role | undefined,
  isLoggedIn: boolean
): string | null {
  // Admin routes
  const adminRoutes = ["/admin"];
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Protected routes (require login)
  const protectedRoutes = ["/dashboard", "/income", "/donations", "/settings"];
  const isProtectedRoute =
    protectedRoutes.some((route) => pathname.startsWith(route)) || isAdminRoute;

  // Auth routes
  const authRoutes = ["/signin", "/signup"];
  const isAuthRoute = authRoutes.includes(pathname);

  // If not logged in and trying to access protected route
  if (!isLoggedIn && isProtectedRoute) {
    return `/signin?callbackUrl=${pathname}`;
  }

  // If logged in and trying to access auth route
  if (isLoggedIn && isAuthRoute) {
    return "/dashboard";
  }

  // If trying to access admin route without admin role
  if (isAdminRoute && !isAdmin(userRole)) {
    return "/dashboard?error=unauthorized";
  }

  return null; // Access granted
}
