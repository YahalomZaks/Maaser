import type {
  Currency as CurrencyDb,
  Donation as DonationRecord,
  DonationType as DonationTypeDb,
  IncomeSchedule as IncomeScheduleDb,
  UserSettings as UserSettingsRecord,
  VariableIncome as VariableIncomeRecord,
} from "@prisma/client";

import { convertCurrency } from "@/lib/finance";
import { prismaClient } from "@/lib/prisma";
import {
  DEFAULT_CARRY_STRATEGY,
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
} from "@/lib/user-settings";
import type { CarryStrategy } from "@/lib/user-settings";
import type {
  CurrencyCode,
  DonationEntry,
  MonthlySnapshot,
  VariableIncome,
  YearSnapshot,
} from "@/types/finance";

const DEFAULT_STRATEGY = DEFAULT_CARRY_STRATEGY;
const FUTURE_PROJECTION_YEARS = 5;
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

export type DeleteScopeMode = "forward" | "all" | "range";

export interface ScopedDeleteOptions {
  mode: DeleteScopeMode;
  cursorYear?: number;
  cursorMonth?: number;
  rangeStartYear?: number;
  rangeStartMonth?: number;
  rangeEndYear?: number;
  rangeEndMonth?: number;
}

const toMonthIndex = (year: number, month: number) => year * 12 + (month - 1);

function normalizeCurrency(
  value: CurrencyCode | CurrencyDb | null | undefined
): CurrencyCode {
  if (value === "USD") {
    return "USD";
  }
  return "ILS";
}

export interface UserFinancialSettings {
  language: string;
  currency: CurrencyCode;
  tithePercent: number;
  startingBalance: number;
  carryStrategy: CarryStrategy;
  monthCarryStrategy: "CARRY_FORWARD" | "INDEPENDENT" | "ASK_ME";
  isFirstTimeSetupCompleted: boolean;
}

function buildDefaultSettings(): UserFinancialSettings {
  return {
    language: DEFAULT_LANGUAGE.toLowerCase(),
    currency: DEFAULT_CURRENCY,
    tithePercent: 10,
    startingBalance: 0,
    carryStrategy: DEFAULT_STRATEGY,
    monthCarryStrategy: "INDEPENDENT",
    isFirstTimeSetupCompleted: false,
  };
}

function mapUserSettingsRecord(
  record: UserSettingsRecord | null
): UserFinancialSettings {
  const normalizeMonthCarryStrategy = (
    value: unknown
  ): UserFinancialSettings["monthCarryStrategy"] => {
    // Temporarily disable ASK_ME – treat as CARRY_FORWARD
    if (value === "ASK_ME") {
      return "CARRY_FORWARD";
    }
    if (value === "CARRY_FORWARD" || value === "INDEPENDENT") {
      return value as UserFinancialSettings["monthCarryStrategy"];
    }
    return "INDEPENDENT";
  };

  if (!record) {
    return buildDefaultSettings();
  }

  return {
    language: record.language.toLowerCase(),
    currency: normalizeCurrency(record.currency),
    tithePercent: record.tithePercent ?? 10,
    startingBalance: record.startingBalance ?? 0,
    carryStrategy: record.carryStrategy ?? DEFAULT_STRATEGY,
    monthCarryStrategy: normalizeMonthCarryStrategy(record.monthCarryStrategy),
    isFirstTimeSetupCompleted: record.isFirstTimeSetupCompleted ?? false,
  };
}

export async function getUserFinancialSettings(
  userId: string
): Promise<UserFinancialSettings> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  return mapUserSettingsRecord(settings);
}

export interface UpsertVariableIncomePayload {
  description: string;
  amount: number;
  currency: CurrencyCode;
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
    date: row.date.toISOString().slice(0, 10),
    schedule: scheduleFromDb[row.schedule] ?? "oneTime",
    totalMonths: row.totalMonths ?? undefined,
    note: row.note ?? undefined,
  };
}

export async function listVariableIncomes(
  userId: string
): Promise<VariableIncome[]> {
  const rows = await prisma.variableIncome.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return rows.map(mapVariableIncome);
}

export async function createVariableIncomeEntry(
  userId: string,
  payload: UpsertVariableIncomePayload
) {
  const row = await prisma.variableIncome.create({
    data: {
      userId,
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      date: new Date(payload.date),
      schedule: scheduleToDb[payload.schedule],
      totalMonths: payload.totalMonths ?? null,
      note: payload.note ?? null,
    },
  });

  return mapVariableIncome(row);
}

export async function deleteVariableIncomeEntry(
  userId: string,
  id: string,
  options?: ScopedDeleteOptions
): Promise<{ deletedId?: string; income?: VariableIncome }> {
  const entry = await prisma.variableIncome.findFirst({
    where: { id, userId },
  });

  if (!entry) {
    return { deletedId: id };
  }

  const mode: DeleteScopeMode = options?.mode ?? "all";

  if (mode === "all") {
    await prisma.variableIncome.deleteMany({ where: { id, userId } });
    return { deletedId: id };
  }

  if (mode === "forward") {
    const cursorYear = options?.cursorYear;
    const cursorMonth = options?.cursorMonth;

    if (!cursorYear || !cursorMonth) {
      throw new Error("INVALID_CURSOR");
    }

    const startYear = entry.date.getFullYear();
    const startMonth = entry.date.getMonth() + 1;
    const startIndex = toMonthIndex(startYear, startMonth);
    const cursorIndex = toMonthIndex(cursorYear, cursorMonth);

    const monthsToKeep = cursorIndex - startIndex;

    if (monthsToKeep <= 0) {
      await prisma.variableIncome.deleteMany({ where: { id, userId } });
      return { deletedId: id };
    }

    const existingTotal = entry.schedule === "MULTI_MONTH" ? entry.totalMonths ?? 0 : null;
    const limitedMonths = existingTotal && existingTotal > 0
      ? Math.min(existingTotal, monthsToKeep)
      : monthsToKeep;

    const nextSchedule = limitedMonths <= 1 ? "ONE_TIME" : "MULTI_MONTH";
    const updated = await prisma.variableIncome.update({
      where: { id },
      data: {
        schedule: nextSchedule,
        totalMonths: nextSchedule === "MULTI_MONTH" ? limitedMonths : null,
      },
    });

    return { income: mapVariableIncome(updated) };
  }

  if (mode === "range") {
    const startYear = options?.rangeStartYear;
    const startMonth = options?.rangeStartMonth;
    const endYear = options?.rangeEndYear;
    const endMonth = options?.rangeEndMonth;

    if (!startYear || !startMonth || !endYear || !endMonth) {
      throw new Error("INVALID_RANGE_PARAMS");
    }

    const originalStartIndex = toMonthIndex(entry.date.getFullYear(), entry.date.getMonth() + 1);
    const rangeStartIndex = toMonthIndex(startYear, startMonth);
    const rangeEndIndex = toMonthIndex(endYear, endMonth);

    if (rangeEndIndex < rangeStartIndex) {
      throw new Error("INVALID_RANGE_ORDER");
    }

    if (rangeStartIndex < originalStartIndex) {
      throw new Error("RANGE_BEFORE_START");
    }

    const totalSpan = rangeEndIndex - rangeStartIndex + 1;
    if (totalSpan <= 0) {
      throw new Error("INVALID_RANGE_ORDER");
    }

    const dateString = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
    const nextSchedule = totalSpan <= 1 ? "ONE_TIME" : "MULTI_MONTH";

    const updated = await prisma.variableIncome.update({
      where: { id },
      data: {
        date: new Date(dateString),
        schedule: nextSchedule,
        totalMonths: nextSchedule === "MULTI_MONTH" ? totalSpan : null,
      },
    });

    return { income: mapVariableIncome(updated) };
  }

  throw new Error("UNSUPPORTED_DELETE_MODE");
}

export async function updateVariableIncomeEntry(
  userId: string,
  id: string,
  payload: UpsertVariableIncomePayload
) {
  await prisma.variableIncome.updateMany({
    where: { id, userId },
    data: {
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      date: new Date(payload.date),
      schedule: scheduleToDb[payload.schedule],
      totalMonths: payload.totalMonths ?? null,
      note: payload.note ?? null,
    },
  });

  // updateMany returns count; fetch updated row for mapping
  const updated = await prisma.variableIncome.findFirst({
    where: { id, userId },
  });
  if (!updated) {
    throw new Error("Income not found after update");
  }
  return mapVariableIncome(updated);
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

export async function createDonationEntry(
  userId: string,
  payload: UpsertDonationPayload
) {
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
      installmentsTotal:
        payload.type === "installments"
          ? payload.installmentsTotal ?? null
          : null,
      installmentsPaid:
        payload.type === "installments"
          ? payload.installmentsPaid ?? null
          : null,
      isActive: payload.type !== "oneTime" ? true : false,
      note: payload.note ?? null,
    },
  });

  return mapDonation(row);
}

export async function deleteDonationEntry(
  userId: string,
  id: string,
  options?: ScopedDeleteOptions
): Promise<{ deletedId?: string; donation?: DonationEntry }> {
  const entry = await prisma.donation.findFirst({
    where: { id, userId },
  });

  if (!entry) {
    return { deletedId: id };
  }

  const mode: DeleteScopeMode = options?.mode ?? "all";

  if (mode === "all" || entry.donationType !== "RECURRING") {
    await prisma.donation.deleteMany({ where: { id, userId } });
    return { deletedId: id };
  }

  const now = new Date();
  const nowIndex = toMonthIndex(now.getFullYear(), now.getMonth() + 1);

  if (mode === "forward") {
    const cursorYear = options?.cursorYear;
    const cursorMonth = options?.cursorMonth;

    if (!cursorYear || !cursorMonth) {
      throw new Error("INVALID_CURSOR");
    }

    const startYear = entry.startDate.getFullYear();
    const startMonth = entry.startDate.getMonth() + 1;
    const startIndex = toMonthIndex(startYear, startMonth);
    const cursorIndex = toMonthIndex(cursorYear, cursorMonth);
    const monthsToKeep = cursorIndex - startIndex;

    if (monthsToKeep <= 0) {
      await prisma.donation.deleteMany({ where: { id, userId } });
      return { deletedId: id };
    }

    const existingTotal = entry.installmentsTotal ?? null;
    const limitedMonths = existingTotal && existingTotal > 0
      ? Math.min(existingTotal, monthsToKeep)
      : monthsToKeep;

    const endIndex = startIndex + limitedMonths - 1;
    const isActive = endIndex >= nowIndex;
    const updated = await prisma.donation.update({
      where: { id },
      data: {
        installmentsTotal: limitedMonths,
        installmentsPaid:
          entry.installmentsPaid != null
            ? Math.min(entry.installmentsPaid, limitedMonths)
            : null,
        isActive,
      },
    });

    return { donation: mapDonation(updated) };
  }

  if (mode === "range") {
    const startYear = options?.rangeStartYear;
    const startMonth = options?.rangeStartMonth;
    const endYear = options?.rangeEndYear;
    const endMonth = options?.rangeEndMonth;

    if (!startYear || !startMonth || !endYear || !endMonth) {
      throw new Error("INVALID_RANGE_PARAMS");
    }

    const originalStartIndex = toMonthIndex(entry.startDate.getFullYear(), entry.startDate.getMonth() + 1);
    const rangeStartIndex = toMonthIndex(startYear, startMonth);
    const rangeEndIndex = toMonthIndex(endYear, endMonth);

    if (rangeEndIndex < rangeStartIndex) {
      throw new Error("INVALID_RANGE_ORDER");
    }

    if (rangeStartIndex < originalStartIndex) {
      throw new Error("RANGE_BEFORE_START");
    }

    const totalSpan = rangeEndIndex - rangeStartIndex + 1;
    if (totalSpan <= 0) {
      throw new Error("INVALID_RANGE_ORDER");
    }

    const dateString = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
    const isActive = rangeEndIndex >= nowIndex;
    const updated = await prisma.donation.update({
      where: { id },
      data: {
        startDate: new Date(dateString),
        year: startYear,
        month: startMonth,
        installmentsTotal: totalSpan,
        installmentsPaid:
          entry.installmentsPaid != null
            ? Math.min(entry.installmentsPaid, totalSpan)
            : null,
        isActive,
      },
    });

    return { donation: mapDonation(updated) };
  }

  throw new Error("UNSUPPORTED_DELETE_MODE");
}

export async function updateDonationEntry(
  userId: string,
  id: string,
  payload: UpsertDonationPayload
) {
  const date = new Date(payload.startDate);
  await prisma.donation.updateMany({
    where: { id, userId },
    data: {
      organizationName: payload.organization,
      amount: payload.amount,
      currency: payload.currency,
      donationType: donationTypeToDb[payload.type],
      startDate: date,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      installmentsTotal:
        payload.type === "installments"
          ? payload.installmentsTotal ?? null
          : null,
      installmentsPaid:
        payload.type === "installments"
          ? payload.installmentsPaid ?? null
          : null,
      isActive: payload.type !== "oneTime" ? true : false,
      note: payload.note ?? null,
    },
  });

  const updated = await prisma.donation.findFirst({ where: { id, userId } });
  if (!updated) {
    throw new Error("Donation not found after update");
  }
  return mapDonation(updated);
}

interface AggregatedMonth {
  incomes: number;
  recurringIncome: number;
  variableIncome: number;
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

function getMonthMap(
  target: Map<number, Map<number, AggregatedMonth>>,
  year: number
) {
  if (!target.has(year)) {
    target.set(year, new Map());
  }
  return target.get(year)!;
}

function getMonthAgg(target: Map<number, AggregatedMonth>, monthIndex: number) {
  if (!target.has(monthIndex)) {
    target.set(monthIndex, {
      incomes: 0,
      recurringIncome: 0,
      variableIncome: 0,
      donations: 0,
      convertedEntries: 0,
      convertedTotal: 0,
    });
  }
  return target.get(monthIndex)!;
}

export interface DashboardData {
  years: YearSnapshot[];
  settings: UserFinancialSettings;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [settings, variableIncomeRows, donationRows] = (await Promise.all([
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.variableIncome.findMany({ where: { userId } }),
    prisma.donation.findMany({ where: { userId } }),
  ])) as [UserSettingsRecord | null, VariableIncomeRecord[], DonationRecord[]];

  const userSettings = mapUserSettingsRecord(settings);

  const baseCurrency = userSettings.currency;

  const aggregated = ensureYearMonths();

  const now = new Date();
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  let maxMonthIndex = nowIndex;

  donationRows.forEach((row) => {
    const idx = row.year * 12 + (row.month - 1);
    maxMonthIndex = Math.max(maxMonthIndex, idx);
  });

  variableIncomeRows.forEach((row) => {
    const date = row.date;
    const idx = date.getFullYear() * 12 + date.getMonth();

    if (
      row.schedule === "MULTI_MONTH" &&
      row.totalMonths &&
      row.totalMonths > 0
    ) {
      maxMonthIndex = Math.max(maxMonthIndex, idx + row.totalMonths - 1);
    } else {
      maxMonthIndex = Math.max(maxMonthIndex, nowIndex);
    }
  });

  const projectionMaxMonthIndex =
    (now.getFullYear() + FUTURE_PROJECTION_YEARS) * 12 + 11;
  maxMonthIndex = Math.max(maxMonthIndex, projectionMaxMonthIndex);

  const addIncomeToMonth = (
    year: number,
    monthIndex: number,
    amount: number,
    currency: CurrencyCode,
    category: "recurring" | "variable"
  ) => {
    const monthMap = getMonthMap(aggregated, year);
    const agg = getMonthAgg(monthMap, monthIndex);
    const converted = convertCurrency(amount, currency, baseCurrency);
    agg.incomes += converted;
    if (category === "recurring") {
      agg.recurringIncome += converted;
    } else {
      agg.variableIncome += converted;
    }
    if (currency !== baseCurrency) {
      agg.convertedEntries += 1;
      agg.convertedTotal += converted;
    }
  };

  variableIncomeRows.forEach((row) => {
    const date = row.date;
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const entryCurrency = normalizeCurrency(row.currency);

    const startIndex = year * 12 + monthIndex;

    if (row.schedule === "RECURRING") {
      for (let idx = startIndex; idx <= maxMonthIndex; idx++) {
        if (idx < startIndex) {
          continue;
        }
        const targetYear = Math.floor(idx / 12);
        const targetMonth = idx % 12;
        addIncomeToMonth(
          targetYear,
          targetMonth,
          row.amount,
          entryCurrency,
          "recurring"
        );
      }
      return;
    }

    if (
      row.schedule === "MULTI_MONTH" &&
      row.totalMonths &&
      row.totalMonths > 0
    ) {
      for (let offset = 0; offset < row.totalMonths; offset++) {
        const idx = startIndex + offset;
        if (idx > maxMonthIndex) {
          break;
        }
        const targetYear = Math.floor(idx / 12);
        const targetMonth = idx % 12;
        addIncomeToMonth(
          targetYear,
          targetMonth,
          row.amount,
          entryCurrency,
          "variable"
        );
      }
      return;
    }

    addIncomeToMonth(year, monthIndex, row.amount, entryCurrency, "variable");
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
      const monthly: MonthlySnapshot[] = Array.from({ length: 12 }).map(
        (_, monthIndex) => {
          const record = monthsMap.get(monthIndex) ?? {
            incomes: 0,
            recurringIncome: 0,
            variableIncome: 0,
            donations: 0,
            convertedEntries: 0,
            convertedTotal: 0,
          };

          return {
            id: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
            monthIndex,
            incomesBase: record.incomes,
            recurringIncomeBase: record.recurringIncome,
            variableIncomeBase: record.variableIncome,
            donationsBase: record.donations,
            convertedEntries: record.convertedEntries,
            convertedTotal: record.convertedTotal,
          };
        }
      );

      return {
        year,
        baseCurrency,
        tithePercent: (userSettings.tithePercent ?? 10) / 100,
        startingBalance: userSettings.startingBalance ?? 0,
        carryStrategy:
          userSettings.carryStrategy === "RESET" ? "reset" : "carry",
        monthly,
      };
    });

  return {
    years,
    settings: userSettings,
  };
}
