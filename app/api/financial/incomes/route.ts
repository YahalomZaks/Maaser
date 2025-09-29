import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logIncomeActivity } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";
import { createVariableIncomeEntry, getUserFinancialSettings, listVariableIncomes } from "@/lib/financial-data";
import type { CurrencyCode, IncomeSchedule, IncomeSource } from "@/types/finance";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings, variableIncomes] = await Promise.all([
    getUserFinancialSettings(session.user.id),
    listVariableIncomes(session.user.id),
  ]);

  return NextResponse.json({ settings, variableIncomes });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { description, amount, currency, source, date, schedule, totalMonths, note } = body ?? {};

    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description required" }, { status: 400 });
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    const normalizedCurrency: CurrencyCode = currency === "USD" ? "USD" : "ILS";
    const normalizedSource: IncomeSource =
      source === "spouse" || source === "other" ? source : "self";
    const normalizedSchedule: IncomeSchedule =
      schedule === "recurring" || schedule === "multiMonth" ? schedule : "oneTime";

    const payload = {
      description: description.trim(),
      amount: amountNumber,
      currency: normalizedCurrency,
      source: normalizedSource,
      date: typeof date === "string" ? date : new Date().toISOString().slice(0, 10),
      schedule: normalizedSchedule,
      totalMonths: normalizedSchedule === "multiMonth" ? Number(totalMonths) || null : null,
      note: typeof note === "string" && note.trim().length > 0 ? note.trim() : null,
    };

    const entry = await createVariableIncomeEntry(session.user.id, payload);

    await logIncomeActivity(session.user.id, "CREATE", entry.id, `Created income: ${entry.description}`, request);

    return NextResponse.json({ income: entry });
  } catch (error) {
    console.error("Failed to create variable income", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
