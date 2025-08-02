import { prismaClient } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth-utils";
import type { NextRequest } from "next/server";

// Types for different activity types
export type ActivityType =
  | "LOGIN"
  | "LOGOUT"
  | "PAGE_VIEW"
  | "INCOME_CREATE"
  | "INCOME_UPDATE"
  | "INCOME_DELETE"
  | "DONATION_CREATE"
  | "DONATION_UPDATE"
  | "DONATION_DELETE"
  | "SETTINGS_UPDATE"
  | "PROFILE_UPDATE"
  | "PASSWORD_CHANGE"
  | "ADMIN_ACTION";

export interface ActivityLogData {
  userId: string;
  activityType: ActivityType;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  page?: string;
  sessionDuration?: number;
}

/**
 * Log user activity to database
 */
export async function logActivity(data: ActivityLogData) {
  try {
    const activity = await prismaClient.userActivityLog.create({
      data: {
        userId: data.userId,
        activityType: data.activityType,
        description: data.description,
        ipAddress: data.ipAddress || undefined,
        userAgent: data.userAgent || undefined,
        metadata: data.metadata || undefined,
        page: data.page || undefined,
        sessionDuration: data.sessionDuration,
        timestamp: new Date(),
      },
    });

    console.log(
      `📝 Activity logged: ${data.activityType} for user ${data.userId}`
    );
    return activity;
  } catch (error) {
    console.error("Error logging activity:", error);
    return null;
  }
}

/**
 * Log login activity
 */
export async function logLogin(userId: string, request?: NextRequest) {
  const ipAddress = getClientIP(request);
  const userAgent = request?.headers.get("user-agent") || undefined;

  // Log in activity log
  await logActivity({
    userId,
    activityType: "LOGIN",
    description: "User logged in",
    ipAddress,
    userAgent,
  });

  // Log in login history
  try {
    await prismaClient.loginHistory.create({
      data: {
        userId,
        ipAddress: ipAddress,
        userAgent: userAgent,
        loginTime: new Date(),
      },
    });
  } catch (error) {
    console.error("Error logging login history:", error);
  }
}

/**
 * Log logout activity
 */
export async function logLogout(userId: string, request?: NextRequest) {
  const ipAddress = getClientIP(request);
  const userAgent = request?.headers.get("user-agent") || undefined;

  await logActivity({
    userId,
    activityType: "LOGOUT",
    description: "User logged out",
    ipAddress,
    userAgent,
  });
}

/**
 * Log page view
 */
export async function logPageView(
  userId: string,
  page: string,
  request?: NextRequest
) {
  const ipAddress = getClientIP(request);
  const userAgent = request?.headers.get("user-agent") || undefined;

  await logActivity({
    userId,
    activityType: "PAGE_VIEW",
    description: `Visited page: ${page}`,
    ipAddress,
    userAgent,
    page,
  });
}

/**
 * Log income-related activities
 */
export async function logIncomeActivity(
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  incomeId: string,
  details?: string,
  request?: NextRequest
) {
  const activityType = `INCOME_${action}` as ActivityType;
  const ipAddress = getClientIP(request);
  const userAgent = request?.headers.get("user-agent") || undefined;

  await logActivity({
    userId,
    activityType,
    description: details || `Income ${action.toLowerCase()}d`,
    ipAddress,
    userAgent,
    metadata: { incomeId },
  });
}

/**
 * Log donation-related activities
 */
export async function logDonationActivity(
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  donationId: string,
  details?: string,
  request?: NextRequest
) {
  const activityType = `DONATION_${action}` as ActivityType;
  const ipAddress = getClientIP(request);
  const userAgent = request?.headers.get("user-agent") || undefined;

  await logActivity({
    userId,
    activityType,
    description: details || `Donation ${action.toLowerCase()}d`,
    ipAddress,
    userAgent,
    metadata: { donationId },
  });
}

/**
 * Log settings and profile updates
 */
export async function logSettingsUpdate(
  userId: string,
  type: "SETTINGS" | "PROFILE" | "PASSWORD",
  details: string,
  request?: NextRequest
) {
  const activityType =
    type === "SETTINGS"
      ? "SETTINGS_UPDATE"
      : type === "PROFILE"
      ? "PROFILE_UPDATE"
      : "PASSWORD_CHANGE";

  const ipAddress = getClientIP(request);
  const userAgent = request?.headers.get("user-agent") || undefined;

  await logActivity({
    userId,
    activityType,
    description: details,
    ipAddress,
    userAgent,
  });
}

/**
 * Log admin actions
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetUserId?: string,
  details?: string,
  request?: NextRequest
) {
  const ipAddress = getClientIP(request);
  const userAgent = request?.headers.get("user-agent") || undefined;

  await logActivity({
    userId: adminUserId,
    activityType: "ADMIN_ACTION",
    description: details || action,
    ipAddress,
    userAgent,
    metadata: { action, targetUserId },
  });
}

/**
 * Get client IP address from request
 */
export function getClientIP(request?: NextRequest): string | undefined {
  if (!request) return undefined;

  // Try different headers for IP address
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const xRealIP = request.headers.get("x-real-ip");
  const xClientIP = request.headers.get("x-client-ip");

  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(",")[0].trim();
  }

  if (xRealIP) {
    return xRealIP;
  }

  if (xClientIP) {
    return xClientIP;
  }

  // Fallback
  return undefined;
}

/**
 * Get user's recent activity
 */
export async function getUserRecentActivity(
  userId: string,
  limit: number = 10
) {
  try {
    const activities = await prismaClient.userActivityLog.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return activities;
  } catch (error) {
    console.error("Error getting user recent activity:", error);
    return [];
  }
}

/**
 * Get all users activity for admin dashboard
 */
export async function getAllUsersActivity(
  limit: number = 50,
  activityType?: ActivityType,
  userId?: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const where: any = {};

    if (activityType) {
      where.activityType = activityType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const activities = await prismaClient.userActivityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return activities;
  } catch (error) {
    console.error("Error getting all users activity:", error);
    return [];
  }
}

/**
 * Get login history for user
 */
export async function getUserLoginHistory(userId: string, limit: number = 10) {
  try {
    const loginHistory = await prismaClient.loginHistory.findMany({
      where: { userId },
      orderBy: { loginTime: "desc" },
      take: limit,
    });

    return loginHistory;
  } catch (error) {
    console.error("Error getting user login history:", error);
    return [];
  }
}
