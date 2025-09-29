import type {
  Currency as CurrencyDb,
  Donation as DonationRecord,
  DonationType as DonationTypeDb,
  Income as IncomeRecord,
  IncomeSchedule as IncomeScheduleDb,
  IncomeSource as IncomeSourceDb,
  UserSettings as UserSettingsRecord,
  VariableIncome as VariableIncomeRecord,
} from "@prisma/client";

import { convertCurrency } from "@/lib/finance";
import { prismaClient } from "@/lib/prisma";
import { DEFAULT_CARRY_STRATEGY, DEFAULT_CURRENCY, DEFAULT_LANGUAGE } from "@/lib/user-settings";
import type { CarryStrategy, FixedIncomeSettings } from "@/lib/user-settings";
import type { CurrencyCode, DonationEntry, MonthlySnapshot, VariableIncome, YearSnapshot } from "@/types/finance";

const DEFAULT_STRATEGY = DEFAULT_CARRY_STRATEGY;
const prisma = prismaClient;

const scheduleToDb: Record<VariableIncome["schedule"], IncomeScheduleDb> = {
  oneTime: "ONE_TIME",
  recurring: "RECURRING",
  multiMonth: "MULTI_MONTH",
};

const scheduleFromDb: Record<IncomeScheduleDb, VariableIncome["schedule"]> = {
  ONE_TIME: "oneTime",
  RECURRING: "recurring",
  MULTI_MONTH: "multiMonth",
};

const sourceToDb: Record<VariableIncome["source"], IncomeSourceDb> = {
  self: "SELF",
  spouse: "SPOUSE",
  other: "OTHER",
};

const sourceFromDb: Record<IncomeSourceDb, VariableIncome["source"]> = {
  SELF: "self",
  SPOUSE: "spouse",
  OTHER: "other",
};

const donationTypeToDb: Record<DonationEntry["type"], DonationTypeDb> = {
  oneTime: "ONE_TIME",
  recurring: "RECURRING",
  installments: "INSTALLMENTS",
};

const donationTypeFromDb: Record<DonationTypeDb, DonationEntry["type"]> = {
  ONE_TIME: "oneTime",
  RECURRING: "recurring",
  INSTALLMENTS: "installments",
};

function normalizeCurrency(value: CurrencyCode | CurrencyDb | null | undefined): CurrencyCode {
  if (value === "USD") {
    return "USD";
  }
  return "ILS";
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

function mapUserSettingsRecord(record: UserSettingsRecord | null): UserFinancialSettings {
  if (!record) {
    return buildDefaultSettings();
  }

  return {
    language: record.language.toLowerCase(),
    currency: normalizeCurrency(record.currency),
    tithePercent: record.tithePercent ?? 10,
    fixedIncome: {
      personal: record.fixedPersonalIncome ?? 0,
      spouse: record.fixedSpouseIncome ?? 0,
      includeSpouse: record.includeSpouseIncome ?? false,
    },
    startingBalance: record.startingBalance ?? 0,
    carryStrategy: record.carryStrategy ?? DEFAULT_STRATEGY,
    isFirstTimeSetupCompleted: record.isFirstTimeSetupCompleted ?? false,
  };
}

export async function getUserFinancialSettings(userId: string): Promise<UserFinancialSettings> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  return mapUserSettingsRecord(settings);
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


function mapVariableIncome(row: VariableIncomeRecord): VariableIncome {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    currency: normalizeCurrency(row.currency),
    source: sourceFromDb[row.source] ?? "other",
    date: row.date.toISOString().slice(0, 10),
    schedule: scheduleFromDb[row.schedule] ?? "oneTime",
    totalMonths: row.totalMonths ?? undefined,
    note: row.note ?? undefined,
  };
}

export async function listVariableIncomes(userId: string): Promise<VariableIncome[]> {
  const rows = await prisma.variableIncome.findMany({
    where: { userId },
    orderBy: { date: "desc" },
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

function mapDonation(row: DonationRecord): DonationEntry {
  return {
    id: row.id,
    organization: row.organizationName,
    amount: row.amount,
    currency: normalizeCurrency(row.currency),
    type: donationTypeFromDb[row.donationType] ?? "recurring",
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
    orderBy: { startDate: "desc" },
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
  const [settings, fixedIncomeRows, variableIncomeRows, donationRows] = (await Promise.all([
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.income.findMany({ where: { userId } }),
    prisma.variableIncome.findMany({ where: { userId } }),
    prisma.donation.findMany({ where: { userId } }),
  ])) as [
    UserSettingsRecord | null,
    IncomeRecord[],
    VariableIncomeRecord[],
    DonationRecord[],
  ];

  const userSettings = mapUserSettingsRecord(settings);

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
    donationRows.forEach((row) => years.add(row.year));
    variableIncomeRows.forEach((row) => years.add(row.date.getFullYear()));
    fixedIncomeRows.forEach((row) => years.add(row.year));

    years.forEach((year) => {
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        addFixedIncome(year, monthIndex);
      }
    });
  }

  variableIncomeRows.forEach((row) => {
    const date = row.date;
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const monthMap = getMonthMap(aggregated, year);
    const agg = getMonthAgg(monthMap, monthIndex);

    const entryCurrency = normalizeCurrency(row.currency);
    const converted = convertCurrency(row.amount, entryCurrency, baseCurrency);
    agg.incomes += converted;
    if (entryCurrency !== baseCurrency) {
      agg.convertedEntries += 1;
      agg.convertedTotal += converted;
    }
  });

  donationRows.forEach((row) => {
    const date = row.startDate;
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const monthMap = getMonthMap(aggregated, year);
    const agg = getMonthAgg(monthMap, monthIndex);

    const entryCurrency = normalizeCurrency(row.currency);
    const converted = convertCurrency(row.amount, entryCurrency, baseCurrency);
    agg.donations += converted;
    if (entryCurrency !== baseCurrency) {
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
