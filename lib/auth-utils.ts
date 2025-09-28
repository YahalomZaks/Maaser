import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";

export const USER_ROLES = ["USER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Get the current user session (for server components)
 */
export async function getCurrentSession(request?: NextRequest): Promise<AuthSession> {
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
  userRole: UserRole | undefined,
  requiredRole: UserRole
): boolean {
  if (!userRole) {
    return false;
  }

  // Admin has access to everything
  if (userRole === "ADMIN") {
    return true;
  }

  // Check exact role match
  return userRole === requiredRole;
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UserRole | undefined): boolean {
  return userRole === "ADMIN";
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(session: unknown): boolean {
  if (typeof session !== "object" || session === null) {
    return false;
  }

  return "user" in session && Boolean((session as { user?: unknown }).user);
}

/**
 * Get user role from session
 */
export function getUserRole(session: unknown): UserRole | undefined {
  if (typeof session !== "object" || session === null) {
    return undefined;
  }

  const user = (session as { user?: unknown }).user;

  if (typeof user !== "object" || user === null) {
    return undefined;
  }

  const role = (user as { role?: unknown }).role;

  if (typeof role !== "string") {
    return undefined;
  }

  const normalizedRole = role.toUpperCase() as UserRole;

  return USER_ROLES.includes(normalizedRole) ? normalizedRole : undefined;
}

/**
 * Protected route checker - returns redirect URL if access denied
 */
export function checkRouteAccess(
  pathname: string,
  userRole: UserRole | undefined,
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
