import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { convertCurrency } from "@/lib/finance";
import {
  getUserFinancialSettings,
  listDonations,
  listVariableIncomes,
} from "@/lib/financial-data";
import type { CurrencyCode, VariableIncome } from "@/types/finance";

function toMonthIndex(year: number, monthIndex: number) {
  return year * 12 + monthIndex;
}

function isIncomeInMonth(
  entry: VariableIncome,
  targetYear: number,
  targetMonthIndex: number
) {
  const start = new Date(entry.date);
  const startIdx = toMonthIndex(start.getFullYear(), start.getMonth());
  const targetIdx = toMonthIndex(targetYear, targetMonthIndex);

  if (entry.schedule === "oneTime") {
    return startIdx === targetIdx;
  }
  if (entry.schedule === "recurring") {
    return targetIdx >= startIdx;
  }
  // multiMonth
  const total = entry.totalMonths ?? 0;
  if (total <= 0) {
    return startIdx === targetIdx;
  }
  return targetIdx >= startIdx && targetIdx < startIdx + total;
}

function normalizeCurrency(
  value: CurrencyCode | null | undefined
): CurrencyCode {
  return value === "USD" ? "USD" : "ILS";
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month")); // 0-11

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 0 ||
    month > 11
  ) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const userId = session.user.id;
  const settings = await getUserFinancialSettings(userId);
  const baseCurrency: CurrencyCode = settings.currency;

  const [incomes, donations] = await Promise.all([
    listVariableIncomes(userId),
    listDonations(userId),
  ]);

  const incomeRows = incomes
    .filter((e) => isIncomeInMonth(e, year, month))
    .map((e) => {
      const amountBase = convertCurrency(
        e.amount,
        normalizeCurrency(e.currency),
        baseCurrency
      );
      return { id: e.id, description: e.description, amountBase };
    });

  const donationRows = donations
    .filter((d) => {
      const dt = new Date(d.startDate);
      return dt.getFullYear() === year && dt.getMonth() === month;
    })
    .map((d) => {
      const amountBase = convertCurrency(
        d.amount,
        normalizeCurrency(d.currency),
        baseCurrency
      );
      return { id: d.id, organization: d.organization, amountBase };
    });

  const totals = {
    income: incomeRows.reduce((sum, r) => sum + r.amountBase, 0),
    donations: donationRows.reduce((sum, r) => sum + r.amountBase, 0),
  };

  return NextResponse.json({
    currency: baseCurrency,
    incomes: incomeRows,
    donations: donationRows,
    totals,
  });
}
