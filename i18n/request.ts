import { getRequestConfig } from "next-intl/server";

export const locales = ["he", "en"] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  try {
    // For now, we'll use simple locale detection without database lookup
    // to avoid Edge Runtime issues with Prisma

    // Fall back to request locale (browser language) or default
    let locale: string = (await requestLocale) || "he";

    // Ensure locale is a string
    if (typeof locale !== "string") {
      locale = "he";
    }

    // Map browser locales to our supported locales
    if (locale.startsWith("he")) {
      locale = "he";
    } else if (locale.startsWith("en")) {
      locale = "en";
    } else {
      locale = "he"; // Default to Hebrew
    }

    return {
      locale: locale as Locale,
      messages: (await import(`../locales/${locale}.json`)).default,
    };
  } catch (error) {
    console.error("Error in i18n config:", error);
    // Fallback to default
    return {
      locale: "he" as Locale,
      messages: (await import("../locales/he.json")).default,
    };
  }
});
