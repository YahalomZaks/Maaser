import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logSettingsUpdate } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";
import { SUPPORTED_LANGUAGES, updateUserLanguage } from "@/lib/user-settings";
import type { LanguageCode } from "@/lib/user-settings";

function normalizeLanguage(value: unknown): LanguageCode | null {
  if (typeof value !== "string") {
    return null;
  }

  const upperValue = value.toUpperCase();
  return SUPPORTED_LANGUAGES.includes(
    upperValue as (typeof SUPPORTED_LANGUAGES)[number]
  )
    ? (upperValue as LanguageCode)
    : null;
}

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
    const language = normalizeLanguage(body.language);

    if (!language) {
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
