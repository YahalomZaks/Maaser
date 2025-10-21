import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logSettingsUpdate } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";
import { getUserFinancialSettings } from "@/lib/financial-data";
import {
  SUPPORTED_CARRY_STRATEGIES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  upsertUserSettings,
} from "@/lib/user-settings";
import type { UserSettingsData } from "@/lib/user-settings";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getUserFinancialSettings(session.user.id);
  return NextResponse.json({ settings });
}

interface UpdatePayload {
  currency?: string;
  language?: string;
  tithePercent?: number;
  startingBalance?: number;
  carryStrategy?: string;
}

function normalizeCurrency(value?: string) {
  if (!value) {
    return undefined;
  }
  const upper = value.toUpperCase();
  return SUPPORTED_CURRENCIES.includes(
    upper as (typeof SUPPORTED_CURRENCIES)[number]
  )
    ? (upper as (typeof SUPPORTED_CURRENCIES)[number])
    : undefined;
}

function normalizeLanguage(value?: string) {
  if (!value) {
    return undefined;
  }
  const upper = value.toUpperCase();
  return SUPPORTED_LANGUAGES.includes(
    upper as (typeof SUPPORTED_LANGUAGES)[number]
  )
    ? (upper as (typeof SUPPORTED_LANGUAGES)[number])
    : undefined;
}

function normalizeCarryStrategy(value?: string) {
  if (!value) {
    return undefined;
  }
  const upper = value.toUpperCase();
  return SUPPORTED_CARRY_STRATEGIES.includes(
    upper as (typeof SUPPORTED_CARRY_STRATEGIES)[number]
  )
    ? (upper as (typeof SUPPORTED_CARRY_STRATEGIES)[number])
    : undefined;
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpdatePayload;

    const updates: Partial<UserSettingsData> = {};

    const currency = normalizeCurrency(body.currency);
    if (currency) {
      updates.currency = currency;
    }

    const language = normalizeLanguage(body.language);
    if (language) {
      updates.language = language;
    }

    if (
      typeof body.tithePercent === "number" &&
      Number.isFinite(body.tithePercent)
    ) {
      updates.tithePercent = Math.max(0, body.tithePercent);
    }

    if (
      typeof body.startingBalance === "number" &&
      Number.isFinite(body.startingBalance)
    ) {
      updates.startingBalance = body.startingBalance;
    }

    const carryStrategy = normalizeCarryStrategy(body.carryStrategy);
    if (carryStrategy) {
      updates.carryStrategy = carryStrategy;
    }

    const updated = await upsertUserSettings(session.user.id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    await logSettingsUpdate(
      session.user.id,
      "SETTINGS",
      "Updated financial preferences",
      request
    );

    const settings = await getUserFinancialSettings(session.user.id);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to update financial settings", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
