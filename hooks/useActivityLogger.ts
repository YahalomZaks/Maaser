"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { usePathname } from "next/navigation";

/**
 * Hook for client-side activity logging
 */
export function useActivityLogger() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const startTimeRef = useRef<number>(Date.now());
  const previousPathnameRef = useRef<string>("");

  // Log page view and track session duration
  useEffect(() => {
    if (!session?.user) return;

    const userId = session.user.id;
    const startTime = Date.now();
    startTimeRef.current = startTime;

    // Don't log if it's the same page
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;

    // Log page view
    logPageView(userId, pathname);

    // Track session duration when page changes or component unmounts
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (duration > 5) {
        // Only log if user spent more than 5 seconds on page
        logSessionDuration(userId, pathname, duration);
      }
    };
  }, [session?.user?.id, pathname]);

  // Log session duration on page unload
  useEffect(() => {
    if (!session?.user) return;

    const handleBeforeUnload = () => {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (duration > 5) {
        // Use sendBeacon for more reliable logging on page unload
        const data = JSON.stringify({
          userId: session.user.id,
          pathname,
          duration,
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/log/session-duration", data);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session?.user?.id, pathname]);

  return {
    logCustomActivity: (
      activityType: string,
      description: string,
      metadata?: any
    ) => {
      if (session?.user) {
        logCustomActivity(session.user.id, activityType, description, metadata);
      }
    },
  };
}

/**
 * Log page view (client-side)
 */
async function logPageView(userId: string, page: string) {
  try {
    await fetch("/api/log/page-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, page }),
    });
  } catch (error) {
    console.error("Error logging page view:", error);
  }
}

/**
 * Log session duration
 */
async function logSessionDuration(
  userId: string,
  page: string,
  duration: number
) {
  try {
    await fetch("/api/log/session-duration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, page, duration }),
    });
  } catch (error) {
    console.error("Error logging session duration:", error);
  }
}

/**
 * Log custom activity
 */
async function logCustomActivity(
  userId: string,
  activityType: string,
  description: string,
  metadata?: any
) {
  try {
    await fetch("/api/log/activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        activityType,
        description,
        metadata,
      }),
    });
  } catch (error) {
    console.error("Error logging custom activity:", error);
  }
}
