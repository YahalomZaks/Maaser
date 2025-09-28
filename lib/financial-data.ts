import { prismaClient } from "@/lib/prisma";
import { convertCurrency } from "@/lib/finance";
import type { CurrencyCode, DonationEntry, MonthlySnapshot, VariableIncome, YearSnapshot } from "@/types/finance";
import type { CarryStrategy, FixedIncomeSettings } from "@/lib/user-settings";
import { DEFAULT_CARRY_STRATEGY, DEFAULT_CURRENCY, DEFAULT_LANGUAGE } from "@/lib/user-settings";

const DEFAULT_STRATEGY = DEFAULT_CARRY_STRATEGY;
const prisma = prismaClient as any;

const scheduleToDb = {
  oneTime: "ONE_TIME",
  recurring: "RECURRING",
  multiMonth: "MULTI_MONTH",
} as const;

const scheduleFromDb = {
  ONE_TIME: "oneTime",
  RECURRING: "recurring",
  MULTI_MONTH: "multiMonth",
} as const satisfies Record<string, VariableIncome["schedule"]>;

const sourceToDb = {
  self: "SELF",
  spouse: "SPOUSE",
  other: "OTHER",
} as const;

const sourceFromDb = {
  SELF: "self",
  SPOUSE: "spouse",
  OTHER: "other",
} as const satisfies Record<string, VariableIncome["source"]>;

const donationTypeToDb = {
  oneTime: "ONE_TIME",
  recurring: "RECURRING",
  installments: "INSTALLMENTS",
} as const;

const donationTypeFromDb = {
  ONE_TIME: "oneTime",
  RECURRING: "recurring",
  INSTALLMENTS: "installments",
} as const satisfies Record<string, DonationEntry["type"]>;

function normalizeCurrency(value: unknown): CurrencyCode {
  return (value === "USD" ? "USD" : "ILS") satisfies CurrencyCode;
}

export interface UserFinancialSettings {
  language: string;
  currency: CurrencyCode;
  tithePercent: number;
  fixedIncome: FixedIncomeSettings;
  startingBalance: number;
  carryStrategy: CarryStrategy;
  isFirstTimeSetupCompleted: boolean;
}

function buildDefaultSettings(): UserFinancialSettings {
  return {
    language: DEFAULT_LANGUAGE.toLowerCase(),
    currency: DEFAULT_CURRENCY,
    tithePercent: 10,
    fixedIncome: {
      personal: 0,
      spouse: 0,
      includeSpouse: false,
    },
    startingBalance: 0,
    carryStrategy: DEFAULT_STRATEGY,
    isFirstTimeSetupCompleted: false,
  };
}

export async function getUserFinancialSettings(userId: string): Promise<UserFinancialSettings> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    return buildDefaultSettings();
  }

  return {
    language: (settings.language ?? DEFAULT_LANGUAGE).toLowerCase(),
    currency: normalizeCurrency(settings.currency),
    tithePercent: (settings as any).tithePercent ?? 10,
    fixedIncome: {
      personal: (settings as any).fixedPersonalIncome ?? 0,
      spouse: (settings as any).fixedSpouseIncome ?? 0,
      includeSpouse: (settings as any).includeSpouseIncome ?? false,
    },
    startingBalance: (settings as any).startingBalance ?? 0,
    carryStrategy: ((settings as any).carryStrategy ?? DEFAULT_STRATEGY) as CarryStrategy,
    isFirstTimeSetupCompleted: settings.isFirstTimeSetupCompleted ?? false,
  };
}

export interface UpsertVariableIncomePayload {
  description: string;
  amount: number;
  currency: CurrencyCode;
  source: VariableIncome["source"];
  date: string;
  schedule: VariableIncome["schedule"];
  totalMonths?: number | null;
  note?: string | null;
}

function mapVariableIncome(row: any): VariableIncome {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    currency: normalizeCurrency(row.currency),
    source: sourceFromDb[(row.source as keyof typeof sourceFromDb) ?? "OTHER"] ?? "other",
    date: row.date.toISOString().slice(0, 10),
    schedule: scheduleFromDb[(row.schedule as keyof typeof scheduleFromDb) ?? "ONE_TIME"] ?? "oneTime",
    totalMonths: row.totalMonths ?? undefined,
    note: row.note ?? undefined,
  };
}

export async function listVariableIncomes(userId: string): Promise<VariableIncome[]> {
  const rows = await prisma.variableIncome.findMany({
    where: { userId },
    orderBy: { date: "desc" } as any,
  });

  return rows.map(mapVariableIncome);
}

export async function createVariableIncomeEntry(
  userId: string,
  payload: UpsertVariableIncomePayload,
) {
  const row = await prisma.variableIncome.create({
    data: {
      userId,
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      source: sourceToDb[payload.source],
      date: new Date(payload.date),
      schedule: scheduleToDb[payload.schedule],
      totalMonths: payload.totalMonths ?? null,
      note: payload.note ?? null,
    },
  });

  return mapVariableIncome(row);
}

export async function deleteVariableIncomeEntry(userId: string, id: string) {
  await prisma.variableIncome.deleteMany({
    where: { id, userId },
  });
}

export interface UpsertDonationPayload {
  organization: string;
  amount: number;
  currency: CurrencyCode;
  type: DonationEntry["type"];
  startDate: string;
  installmentsTotal?: number | null;
  installmentsPaid?: number | null;
  note?: string | null;
}

function mapDonation(row: any): DonationEntry {
  return {
    id: row.id,
    organization: row.organizationName,
    amount: row.amount,
    currency: normalizeCurrency(row.currency),
    type: donationTypeFromDb[(row.donationType as keyof typeof donationTypeFromDb) ?? "RECURRING"] ?? "recurring",
    startDate: row.startDate.toISOString().slice(0, 10),
    installmentsTotal: row.installmentsTotal ?? undefined,
    installmentsPaid: row.installmentsPaid ?? undefined,
    isActive: row.isActive ?? true,
    note: row.note ?? undefined,
  };
}

export async function listDonations(userId: string): Promise<DonationEntry[]> {
  const rows = await prisma.donation.findMany({
    where: { userId },
    orderBy: { startDate: "desc" } as any,
  });

  return rows.map(mapDonation);
}

export async function createDonationEntry(userId: string, payload: UpsertDonationPayload) {
  const date = new Date(payload.startDate);
  const row = await prisma.donation.create({
    data: {
      userId,
      organizationName: payload.organization,
      amount: payload.amount,
      currency: payload.currency,
      donationType: donationTypeToDb[payload.type],
      startDate: date,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      installmentsTotal: payload.type === "installments" ? payload.installmentsTotal ?? null : null,
      installmentsPaid: payload.type === "installments" ? payload.installmentsPaid ?? null : null,
      isActive: payload.type !== "oneTime" ? true : false,
      note: payload.note ?? null,
    },
  });

  return mapDonation(row);
}

export async function deleteDonationEntry(userId: string, id: string) {
  await prisma.donation.deleteMany({
    where: { id, userId },
  });
}

interface AggregatedMonth {
  incomes: number;
  donations: number;
  convertedEntries: number;
  convertedTotal: number;
}

function ensureYearMonths(): Map<number, Map<number, AggregatedMonth>> {
  const map = new Map<number, Map<number, AggregatedMonth>>();
  const currentYear = new Date().getFullYear();
  map.set(currentYear, new Map());
  return map;
}

function getMonthMap(target: Map<number, Map<number, AggregatedMonth>>, year: number) {
  if (!target.has(year)) {
    target.set(year, new Map());
  }
  return target.get(year)!;
}

function getMonthAgg(target: Map<number, AggregatedMonth>, monthIndex: number) {
  if (!target.has(monthIndex)) {
    target.set(monthIndex, { incomes: 0, donations: 0, convertedEntries: 0, convertedTotal: 0 });
  }
  return target.get(monthIndex)!;
}

export interface DashboardData {
  years: YearSnapshot[];
  settings: UserFinancialSettings;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [settings, fixedIncomeRows, variableIncomeRows, donationRows] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.income.findMany({ where: { userId } }),
    prisma.variableIncome.findMany({ where: { userId } }),
    prisma.donation.findMany({ where: { userId } }),
  ]);

  const userSettings = settings
    ? {
        language: (settings.language ?? DEFAULT_LANGUAGE).toLowerCase(),
        currency: normalizeCurrency(settings.currency),
        tithePercent: (settings as any).tithePercent ?? 10,
        fixedIncome: {
          personal: (settings as any).fixedPersonalIncome ?? 0,
          spouse: (settings as any).fixedSpouseIncome ?? 0,
          includeSpouse: (settings as any).includeSpouseIncome ?? false,
        },
        startingBalance: (settings as any).startingBalance ?? 0,
        carryStrategy: ((settings as any).carryStrategy ?? DEFAULT_STRATEGY) as CarryStrategy,
        isFirstTimeSetupCompleted: settings.isFirstTimeSetupCompleted ?? false,
      }
    : buildDefaultSettings();

  const baseCurrency = userSettings.currency;

  const aggregated = ensureYearMonths();

  const fixedMonthlyAmount =
    userSettings.fixedIncome.personal +
    (userSettings.fixedIncome.includeSpouse ? userSettings.fixedIncome.spouse : 0);

  const addFixedIncome = (year: number, monthIndex: number) => {
    if (fixedMonthlyAmount === 0) {
      return;
    }
    const monthMap = getMonthMap(aggregated, year);
    const agg = getMonthAgg(monthMap, monthIndex);
    agg.incomes += convertCurrency(fixedMonthlyAmount, baseCurrency, baseCurrency);
  };

  // Seed all months for years present in fixed income records
  if (fixedMonthlyAmount > 0) {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    donationRows.forEach((row: any) => years.add(row.year));
    variableIncomeRows.forEach((row: any) => years.add(new Date(row.date).getFullYear()));
    fixedIncomeRows.forEach((row: any) => years.add(row.year));

    years.forEach((year) => {
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        addFixedIncome(year, monthIndex);
      }
    });
  }

  variableIncomeRows.forEach((row: any) => {
    const date = row.date instanceof Date ? row.date : new Date(row.date);
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const monthMap = getMonthMap(aggregated, year);
    const agg = getMonthAgg(monthMap, monthIndex);

    const converted = convertCurrency(row.amount, row.currency as CurrencyCode, baseCurrency);
    agg.incomes += converted;
    if (row.currency !== baseCurrency) {
      agg.convertedEntries += 1;
      agg.convertedTotal += converted;
    }
  });

  donationRows.forEach((row: any) => {
    const date = row.startDate instanceof Date ? row.startDate : new Date(row.startDate);
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const monthMap = getMonthMap(aggregated, year);
    const agg = getMonthAgg(monthMap, monthIndex);

    const converted = convertCurrency(row.amount, row.currency as CurrencyCode, baseCurrency);
    agg.donations += converted;
    if (row.currency !== baseCurrency) {
      agg.convertedEntries += 1;
      agg.convertedTotal += converted;
    }
  });

  const years = Array.from(aggregated.entries())
    .sort((a, b) => b[0] - a[0])
    .map<YearSnapshot>(([year, monthsMap]) => {
      const monthly: MonthlySnapshot[] = Array.from({ length: 12 }).map((_, monthIndex) => {
        const record = monthsMap.get(monthIndex) ?? {
          incomes: 0,
          donations: 0,
          convertedEntries: 0,
          convertedTotal: 0,
        };

        return {
          id: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
          monthIndex,
          incomesBase: record.incomes,
          donationsBase: record.donations,
          convertedEntries: record.convertedEntries,
          convertedTotal: record.convertedTotal,
        };
      });

      return {
        year,
        baseCurrency,
        tithePercent: (userSettings.tithePercent ?? 10) / 100,
        startingBalance: userSettings.startingBalance ?? 0,
        carryStrategy: userSettings.carryStrategy === "RESET" ? "reset" : "carry",
        monthly,
      };
    });

  return {
    years,
    settings: userSettings,
  };
}
