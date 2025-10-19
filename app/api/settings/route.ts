import type {
  CarryStrategy,
  Currency,
  Language,
  MonthCarryStrategy,
  UserSettings,
} from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prismaClient } from "@/lib/prisma";

const carryStrategyToClient: Record<
  CarryStrategy,
  "carry" | "carryPositiveOnly" | "reset"
> = {
  CARRY: "carry",
  CARRY_POSITIVE_ONLY: "carryPositiveOnly",
  RESET: "reset",
};

function toCarryStrategy(value: unknown): CarryStrategy | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const upper = value.toUpperCase();
  if (
    upper === "CARRY" ||
    upper === "CARRY_POSITIVE_ONLY" ||
    upper === "RESET"
  ) {
    return upper as CarryStrategy;
  }
  switch (value.toLowerCase()) {
    case "carry":
      return "CARRY";
    case "carrypositiveonly":
      return "CARRY_POSITIVE_ONLY";
    case "reset":
      return "RESET";
    default:
      return undefined;
  }
}

const monthStrategyToClient: Record<
  MonthCarryStrategy,
  "independent" | "carryForward" | "askMe"
> = {
  INDEPENDENT: "independent",
  CARRY_FORWARD: "carryForward",
  ASK_ME: "askMe",
};

function toMonthStrategy(value: unknown): MonthCarryStrategy | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const upper = value.toUpperCase();
  if (
    upper === "INDEPENDENT" ||
    upper === "CARRY_FORWARD" ||
    upper === "ASK_ME"
  ) {
    return upper as MonthCarryStrategy;
  }
  switch (value.toLowerCase()) {
    case "independent":
      return "INDEPENDENT";
    case "carryforward":
      return "CARRY_FORWARD";
    case "askme":
      return "ASK_ME";
    default:
      return undefined;
  }
}

const languageToClient: Record<Language, "he" | "en"> = {
  HE: "he",
  EN: "en",
};

function toLanguage(value: unknown): Language | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const upper = value.toUpperCase();
  if (upper === "HE" || upper === "EN") {
    return upper as Language;
  }
  switch (value.toLowerCase()) {
    case "he":
      return "HE";
    case "en":
      return "EN";
    default:
      return undefined;
  }
}

function toCurrency(value: unknown): Currency | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const upper = value.toUpperCase();
  return upper === "ILS" || upper === "USD" ? (upper as Currency) : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }
  return undefined;
}

function mapSettingsToClient(settings?: UserSettings | null) {
  return {
    baseCurrency: settings?.currency ?? "ILS",
    tithePercent: settings?.tithePercent ?? 10,
    yearEndStrategy: settings?.carryStrategy
      ? carryStrategyToClient[settings.carryStrategy]
      : "carry",
    monthStartStrategy: settings?.monthCarryStrategy
      ? monthStrategyToClient[settings.monthCarryStrategy]
      : "independent",
    preferredLanguage: settings?.language
      ? languageToClient[settings.language]
      : "he",
    notifyDonationEnding: settings?.notifyDonationEnding ?? true,
    notifyDebtTwoMonths: settings?.notifyDebtTwoMonths ?? true,
  };
}

function buildSettingsUpdates(data: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};

  const currency = toCurrency(data.baseCurrency ?? data.currency);
  if (currency) {
    updates.currency = currency;
  }

  const tithePercent = toNumber(data.tithePercent ?? data.tithe);
  if (tithePercent !== undefined) {
    updates.tithePercent = tithePercent;
  }

  const carryStrategy = toCarryStrategy(
    data.yearEndStrategy ?? data.carryStrategy
  );
  if (carryStrategy) {
    updates.carryStrategy = carryStrategy;
  }

  const monthStrategy = toMonthStrategy(
    data.monthStartStrategy ?? data.monthCarryStrategy
  );
  if (monthStrategy) {
    updates.monthCarryStrategy = monthStrategy;
  }

  const language = toLanguage(data.preferredLanguage ?? data.language);
  if (language) {
    updates.language = language;
  }

  const notifyDonationEnding = toBoolean(data.notifyDonationEnding);
  if (notifyDonationEnding !== undefined) {
    updates.notifyDonationEnding = notifyDonationEnding;
  }

  const notifyDebtTwoMonths = toBoolean(data.notifyDebtTwoMonths);
  if (notifyDebtTwoMonths !== undefined) {
    updates.notifyDebtTwoMonths = notifyDebtTwoMonths;
  }

  return updates;
}

function serializeUserResponse(user: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  settings: UserSettings | null;
}) {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    ...mapSettingsToClient(user.settings),
  };
}

// Use Better Auth session to identify the user instead of a custom cookie.
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Merge flatten response expected by client
    return NextResponse.json(
      serializeUserResponse({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        settings: user.settings,
      })
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    // allowed keys to update
    const allowed = [
      "firstName",
      "lastName",
      "baseCurrency",
      "currency",
      "tithePercent",
      "tithe",
      "yearEndStrategy",
      "carryStrategy",
      "monthStartStrategy",
      "monthCarryStrategy",
      "preferredLanguage",
      "language",
      "notifyDonationEnding",
      "notifyDebtTwoMonths",
    ];

    const data: Record<string, unknown> = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        data[k] = body[k];
      }
    }

    // If some top-level user fields are present, update User; the rest go to settings
    const userUpdates: Record<string, unknown> = {};

    if (data.firstName !== undefined) {
      userUpdates.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      userUpdates.lastName = data.lastName;
    }

    const settingsUpdates = buildSettingsUpdates(data);

    // Upsert settings and user in a transaction
    const updated = await prismaClient.$transaction(async (tx) => {
      if (Object.keys(userUpdates).length > 0) {
        const existingUser = await tx.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, name: true },
        });
        // If first/last name changes, also update the display name (User.name)
        const nextFirst =
          (userUpdates.firstName as string | undefined) ??
          existingUser?.firstName ??
          "";
        const nextLast =
          (userUpdates.lastName as string | undefined) ??
          existingUser?.lastName ??
          "";
        const displayName = `${(nextFirst || "").toString().trim()} ${(
          nextLast || ""
        )
          .toString()
          .trim()}`.trim();
        const finalUserUpdates = {
          ...userUpdates,
          ...(displayName ? { name: displayName } : {}),
        };
        await tx.user.update({ where: { id: userId }, data: finalUserUpdates });
      }

      if (Object.keys(settingsUpdates).length > 0) {
        // Try to update existing settings row
        const existing = await tx.userSettings.findUnique({
          where: { userId },
        });
        if (existing) {
          await tx.userSettings.update({
            where: { userId },
            data: settingsUpdates,
          });
        } else {
          await tx.userSettings.create({
            data: { userId, ...settingsUpdates },
          });
        }
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          settings: true,
        },
      });
      return user;
    });

    if (!updated) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ...serializeUserResponse(updated),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
