import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUserLanguage } from "@/lib/user-settings";
import { Language } from "@prisma/client";
import { logSettingsUpdate } from "@/lib/activity-logger";

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
    const { language } = body;

    // Validate language
    if (!language || !Object.values(Language).includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    // Update user's language preference
    const updatedSettings = await updateUserLanguage(session.user.id, language);

    if (!updatedSettings) {
      return NextResponse.json(
        { error: "Failed to update language" },
        { status: 500 }
      );
    }

    // Log the settings update
    await logSettingsUpdate(
      session.user.id,
      "SETTINGS",
      `Language changed to ${language}`,
      request
    );

    return NextResponse.json({
      success: true,
      language: updatedSettings.language,
    });
  } catch (error) {
    console.error("Error updating language:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
