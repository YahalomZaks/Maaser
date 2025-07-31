import { NextRequest, NextResponse } from "next/server";
import { logActivity, getClientIP } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { activityType, description, metadata } = body;

    if (!activityType || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || undefined;

    // Log the activity
    const activity = await logActivity({
      userId: session.user.id,
      activityType,
      description,
      ipAddress,
      userAgent,
      metadata,
    });

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error("Error in activity logging API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
