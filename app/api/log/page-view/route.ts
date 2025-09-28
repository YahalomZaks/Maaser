import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logPageView } from "@/lib/activity-logger";
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
    const { page } = body;

    if (!page) {
      return NextResponse.json(
        { error: "Missing page parameter" },
        { status: 400 }
      );
    }

    // Log the page view
    await logPageView(session.user.id, page, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in page view logging API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
