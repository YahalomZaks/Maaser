import { NextRequest, NextResponse } from "next/server";
import { logPageView, getClientIP } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";

/**
 * Middleware for automatic page view logging
 * This will log every page visit for authenticated users
 */
export async function logPageViewMiddleware(request: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Only log for authenticated users
    if (!session?.user) {
      return;
    }

    const userId = session.user.id;
    const pathname = request.nextUrl.pathname;

    // Skip logging for certain paths
    const skipPaths = [
      "/api",
      "/_next",
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
    ];

    const shouldSkip = skipPaths.some((path) => pathname.startsWith(path));

    if (shouldSkip) {
      return;
    }

    // Log the page view (don't await to avoid blocking the request)
    logPageView(userId, pathname, request).catch((error) => {
      console.error("Error logging page view:", error);
    });
  } catch (error) {
    // Silently fail - don't break the request if logging fails
    console.error("Error in page view logging middleware:", error);
  }
}

/**
 * Session duration tracker
 * This can be used to track how long users spend on each page
 */
export class SessionTracker {
  private static sessions = new Map<
    string,
    { startTime: number; lastActivity: number }
  >();

  static startSession(userId: string) {
    const now = Date.now();
    this.sessions.set(userId, {
      startTime: now,
      lastActivity: now,
    });
  }

  static updateActivity(userId: string) {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  static getSessionDuration(userId: string): number {
    const session = this.sessions.get(userId);
    if (!session) return 0;

    return Math.floor((Date.now() - session.startTime) / 1000); // Duration in seconds
  }

  static endSession(userId: string): number {
    const duration = this.getSessionDuration(userId);
    this.sessions.delete(userId);
    return duration;
  }

  static cleanupInactiveSessions(maxInactiveMinutes: number = 30) {
    const now = Date.now();
    const maxInactiveMs = maxInactiveMinutes * 60 * 1000;

    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxInactiveMs) {
        this.sessions.delete(userId);
      }
    }
  }
}

// Clean up inactive sessions every 5 minutes
if (typeof window === "undefined") {
  setInterval(() => {
    SessionTracker.cleanupInactiveSessions(30);
  }, 5 * 60 * 1000);
}
