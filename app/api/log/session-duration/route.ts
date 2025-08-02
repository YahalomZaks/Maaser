import { NextRequest, NextResponse } from "next/server";
import { logActivity, getClientIP } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // For sendBeacon requests, we might not have full session info
    // so we'll try to get it from the request body
    const body = await request.json();
    const { userId, pathname, duration } = body;

    if (!userId || !pathname || duration === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || undefined;

    // Log the session duration
    await logActivity({
      userId,
      activityType: "PAGE_VIEW",
      description: `Spent ${duration} seconds on ${pathname}`,
      ipAddress,
      userAgent,
      page: pathname,
      sessionDuration: duration,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in session duration logging API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
