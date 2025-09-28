import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { logDonationActivity, logIncomeActivity, logSettingsUpdate } from "@/lib/activity-logger";
import {
  getUserFinancialSettings,
  createVariableIncomeEntry,
  createDonationEntry,
} from "@/lib/financial-data";
import {
  DEFAULT_CARRY_STRATEGY,
  DEFAULT_CURRENCY,
  SUPPORTED_CARRY_STRATEGIES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  upsertUserSettings,
} from "@/lib/user-settings";
import type { CurrencyCode, DonationType, IncomeSchedule, IncomeSource } from "@/types/finance";

interface OnboardingIncomeInput {
  description: string;
  amount: number;
  currency: CurrencyCode;
  source: IncomeSource;
  date: string;
  schedule: IncomeSchedule;
  totalMonths?: number | null;
  note?: string | null;
}

interface OnboardingDonationInput {
  organization: string;
  amount: number;
  currency: CurrencyCode;
  type: DonationType;
  startDate: string;
  installmentsTotal?: number | null;
  installmentsPaid?: number | null;
  note?: string | null;
}

interface OnboardingPayload {
  language?: string;
  currency?: CurrencyCode;
  tithePercent?: number;
  fixedIncome?: {
    personal?: number;
    spouse?: number;
    includeSpouse?: boolean;
  };
  startingBalance?: number;
  carryStrategy?: string;
  variableIncomes?: OnboardingIncomeInput[];
  donations?: OnboardingDonationInput[];
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getUserFinancialSettings(session.user.id);
  return NextResponse.json({ needsSetup: !settings.isFirstTimeSetupCompleted });
}

function normalizeCurrency(value?: string): CurrencyCode {
  if (!value) return DEFAULT_CURRENCY;
  const upper = value.toUpperCase();
  return SUPPORTED_CURRENCIES.includes(upper as (typeof SUPPORTED_CURRENCIES)[number])
    ? (upper as CurrencyCode)
    : DEFAULT_CURRENCY;
}

function normalizeLanguage(value?: string) {
  if (!value) return SUPPORTED_LANGUAGES[0];
  const upper = value.toUpperCase();
  return SUPPORTED_LANGUAGES.includes(upper as (typeof SUPPORTED_LANGUAGES)[number])
    ? (upper as (typeof SUPPORTED_LANGUAGES)[number])
    : SUPPORTED_LANGUAGES[0];
}

function normalizeCarryStrategy(value?: string) {
  if (!value) return DEFAULT_CARRY_STRATEGY;
  const upper = value.toUpperCase();
  return SUPPORTED_CARRY_STRATEGIES.includes(upper as (typeof SUPPORTED_CARRY_STRATEGIES)[number])
    ? upper
    : DEFAULT_CARRY_STRATEGY;
}

function sanitizeIncome(input: OnboardingIncomeInput): OnboardingIncomeInput {
  return {
    description: input.description.trim(),
    amount: Math.max(0, Number(input.amount) || 0),
    currency: normalizeCurrency(input.currency),
    source: input.source === "spouse" || input.source === "other" ? input.source : "self",
    date: input.date || new Date().toISOString().slice(0, 10),
    schedule: input.schedule === "recurring" || input.schedule === "multiMonth" ? input.schedule : "oneTime",
    totalMonths:
      input.schedule === "multiMonth" && Number.isFinite(Number(input.totalMonths))
        ? Number(input.totalMonths)
        : null,
    note: input.note ? input.note.trim() : null,
  };
}

function sanitizeDonation(input: OnboardingDonationInput): OnboardingDonationInput {
  const normalizedType: DonationType =
    input.type === "installments" || input.type === "oneTime" ? input.type : "recurring";

  return {
    organization: input.organization.trim(),
    amount: Math.max(0, Number(input.amount) || 0),
    currency: normalizeCurrency(input.currency),
    type: normalizedType,
    startDate: input.startDate || new Date().toISOString().slice(0, 10),
    installmentsTotal:
      normalizedType === "installments" && Number.isFinite(Number(input.installmentsTotal))
        ? Number(input.installmentsTotal)
        : null,
    installmentsPaid:
      normalizedType === "installments" && Number.isFinite(Number(input.installmentsPaid))
        ? Number(input.installmentsPaid)
        : null,
    note: input.note ? input.note.trim() : null,
  };
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as OnboardingPayload;

    const language = normalizeLanguage(body.language);
    const currency = normalizeCurrency(body.currency);
    const tithePercent = Math.max(0, Number(body.tithePercent) || 10);
    const startingBalance = Number.isFinite(Number(body.startingBalance))
      ? Number(body.startingBalance)
      : 0;
    const carryStrategy = normalizeCarryStrategy(body.carryStrategy);

    const fixedIncomePersonal = Math.max(0, Number(body.fixedIncome?.personal) || 0);
    const fixedIncomeSpouse = Math.max(0, Number(body.fixedIncome?.spouse) || 0);
    const includeSpouseIncome = Boolean(body.fixedIncome?.includeSpouse);

    await upsertUserSettings(session.user.id, {
      language,
      currency,
      tithePercent,
      fixedPersonalIncome: fixedIncomePersonal,
      fixedSpouseIncome: fixedIncomeSpouse,
      includeSpouseIncome,
      startingBalance,
      carryStrategy,
      isFirstTimeSetupCompleted: true,
    } as any);

    await logSettingsUpdate(session.user.id, "SETTINGS", "Completed onboarding wizard", request);

    const incomes = Array.isArray(body.variableIncomes)
      ? body.variableIncomes.map(sanitizeIncome).filter((income) => income.description && income.amount > 0)
      : [];
    const donations = Array.isArray(body.donations)
      ? body.donations.map(sanitizeDonation).filter((donation) => donation.organization && donation.amount > 0)
      : [];

    await Promise.all([
      ...incomes.map(async (income) => {
        const entry = await createVariableIncomeEntry(session.user.id, income);
        await logIncomeActivity(session.user.id, "CREATE", entry.id, `Onboarding income: ${entry.description}`, request);
      }),
      ...donations.map(async (donation) => {
        const entry = await createDonationEntry(session.user.id, donation);
        await logDonationActivity(session.user.id, "CREATE", entry.id, `Onboarding donation: ${entry.organization}`, request);
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to complete onboarding", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
