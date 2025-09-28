import { prismaClient } from "@/lib/prisma";

export const SUPPORTED_LANGUAGES = ["HE", "EN"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: LanguageCode = "HE";

export const SUPPORTED_CURRENCIES = ["ILS", "USD"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: CurrencyCode = "ILS";

export interface UserSettingsData {
  language: LanguageCode;
  currency: CurrencyCode;
  isFirstTimeSetupCompleted: boolean;
}

/**
 * Get user settings from database
 */
export async function getUserSettings(userId: string) {
  try {
    const settings = await prismaClient.userSettings.findUnique({
      where: { userId },
    });

    return settings;
  } catch (error) {
    console.error("Error getting user settings:", error);
    return null;
  }
}

/**
 * Create or update user settings
 */
export async function upsertUserSettings(
  userId: string,
  data: Partial<UserSettingsData>
) {
  try {
    const settings = await prismaClient.userSettings.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        userId,
        language: data.language || DEFAULT_LANGUAGE,
        currency: data.currency || DEFAULT_CURRENCY,
        isFirstTimeSetupCompleted: data.isFirstTimeSetupCompleted || false,
      },
    });

    return settings;
  } catch (error) {
    console.error("Error upserting user settings:", error);
    return null;
  }
}

/**
 * Update user language preference
 */
export async function updateUserLanguage(userId: string, language: LanguageCode) {
  try {
    const settings = await upsertUserSettings(userId, { language });
    return settings;
  } catch (error) {
    console.error("Error updating user language:", error);
    return null;
  }
}

/**
 * Update user currency preference
 */
export async function updateUserCurrency(userId: string, currency: CurrencyCode) {
  try {
    const settings = await upsertUserSettings(userId, { currency });
    return settings;
  } catch (error) {
    console.error("Error updating user currency:", error);
    return null;
  }
}

/**
 * Mark first-time setup as completed
 */
export async function completeFirstTimeSetup(userId: string) {
  try {
    const settings = await upsertUserSettings(userId, {
      isFirstTimeSetupCompleted: true,
    });
    return settings;
  } catch (error) {
    console.error("Error completing first-time setup:", error);
    return null;
  }
}

/**
 * Check if user needs first-time setup
 */
export async function needsFirstTimeSetup(userId: string): Promise<boolean> {
  try {
    const settings = await getUserSettings(userId);
    return !settings?.isFirstTimeSetupCompleted;
  } catch (error) {
    console.error("Error checking first-time setup status:", error);
    return true; // Default to true for safety
  }
}

/**
 * Get user's preferred locale string for i18n
 */
export async function getUserLocale(userId: string): Promise<"he" | "en"> {
  try {
    const settings = await getUserSettings(userId);
    return settings?.language === "EN" ? "en" : "he";
  } catch (error) {
    console.error("Error getting user locale:", error);
    return "he"; // Default to Hebrew
  }
}
