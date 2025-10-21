import type { Prisma } from "@prisma/client";

import { prismaClient } from "@/lib/prisma";

export const SUPPORTED_LANGUAGES = ["HE", "EN"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: LanguageCode = "HE";

export const SUPPORTED_CURRENCIES = ["ILS", "USD"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: CurrencyCode = "ILS";

export const SUPPORTED_CARRY_STRATEGIES = [
  "CARRY",
  "CARRY_POSITIVE_ONLY",
  "RESET",
] as const;
export type CarryStrategy = (typeof SUPPORTED_CARRY_STRATEGIES)[number];
export const DEFAULT_CARRY_STRATEGY: CarryStrategy = "CARRY";

export interface UserSettingsData {
  language: LanguageCode;
  currency: CurrencyCode;
  tithePercent: number;
  startingBalance: number;
  carryStrategy: CarryStrategy;
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
    const updateData: Prisma.UserSettingsUncheckedUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.language !== undefined) {
      updateData.language = data.language;
    }
    if (data.currency !== undefined) {
      updateData.currency = data.currency;
    }
    if (data.tithePercent !== undefined) {
      updateData.tithePercent = data.tithePercent;
    }
    if (data.startingBalance !== undefined) {
      updateData.startingBalance = data.startingBalance;
    }
    if (data.carryStrategy !== undefined) {
      updateData.carryStrategy = data.carryStrategy;
    }
    if (data.isFirstTimeSetupCompleted !== undefined) {
      updateData.isFirstTimeSetupCompleted = data.isFirstTimeSetupCompleted;
    }

    const createData: Prisma.UserSettingsUncheckedCreateInput = {
      userId,
      language: data.language ?? DEFAULT_LANGUAGE,
      currency: data.currency ?? DEFAULT_CURRENCY,
      tithePercent: data.tithePercent ?? 10,
      startingBalance: data.startingBalance ?? 0,
      carryStrategy: data.carryStrategy ?? DEFAULT_CARRY_STRATEGY,
      isFirstTimeSetupCompleted: data.isFirstTimeSetupCompleted ?? false,
    };

    const settings = await prismaClient.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: createData,
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
export async function updateUserLanguage(
  userId: string,
  language: LanguageCode
) {
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
export async function updateUserCurrency(
  userId: string,
  currency: CurrencyCode
) {
  try {
    const settings = await upsertUserSettings(userId, { currency });
    return settings;
  } catch (error) {
    console.error("Error updating user currency:", error);
    return null;
  }
}

export async function updateTithePercent(userId: string, tithePercent: number) {
  try {
    const settings = await upsertUserSettings(userId, { tithePercent });
    return settings;
  } catch (error) {
    console.error("Error updating tithe percent:", error);
    return null;
  }
}

export async function updateCarryStrategy(
  userId: string,
  carryStrategy: CarryStrategy
) {
  try {
    const settings = await upsertUserSettings(userId, { carryStrategy });
    return settings;
  } catch (error) {
    console.error("Error updating carry strategy:", error);
    return null;
  }
}

export async function updateStartingBalance(
  userId: string,
  startingBalance: number
) {
  try {
    const settings = await upsertUserSettings(userId, { startingBalance });
    return settings;
  } catch (error) {
    console.error("Error updating starting balance:", error);
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
