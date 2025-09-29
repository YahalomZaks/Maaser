import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logDonationActivity } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";
import { createDonationEntry, getUserFinancialSettings, listDonations } from "@/lib/financial-data";
import type { CurrencyCode, DonationType } from "@/types/finance";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings, donations] = await Promise.all([
    getUserFinancialSettings(session.user.id),
    listDonations(session.user.id),
  ]);

  return NextResponse.json({ settings, donations });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { organization, amount, currency, type, startDate, installmentsTotal, installmentsPaid, note } = body ?? {};

    if (!organization || typeof organization !== "string") {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    const normalizedCurrency: CurrencyCode = currency === "USD" ? "USD" : "ILS";
    const normalizedType: DonationType =
      type === "installments" || type === "oneTime" ? type : "recurring";
    const normalizedDate = typeof startDate === "string" ? startDate : new Date().toISOString().slice(0, 10);

    const payload = {
      organization: organization.trim(),
      amount: amountNumber,
      currency: normalizedCurrency,
      type: normalizedType,
      startDate: normalizedDate,
      installmentsTotal:
        normalizedType === "installments" && Number.isFinite(Number(installmentsTotal))
          ? Number(installmentsTotal)
          : null,
      installmentsPaid:
        normalizedType === "installments" && Number.isFinite(Number(installmentsPaid))
          ? Number(installmentsPaid)
          : null,
      note: typeof note === "string" && note.trim().length > 0 ? note.trim() : null,
    };

    const entry = await createDonationEntry(session.user.id, payload);

    await logDonationActivity(session.user.id, "CREATE", entry.id, `Created donation: ${entry.organization}`, request);

    return NextResponse.json({ donation: entry });
  } catch (error) {
    console.error("Failed to create donation", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
