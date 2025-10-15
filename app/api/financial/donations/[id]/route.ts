import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logDonationActivity } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";
import { deleteDonationEntry, updateDonationEntry } from "@/lib/financial-data";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deleteDonationEntry(session.user.id, id);
  await logDonationActivity(
    session.user.id,
    "DELETE",
    id,
    "Deleted donation entry",
    request
  );

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      organization,
      amount,
      currency,
      type,
      startDate,
      installmentsTotal,
      installmentsPaid,
      note,
    } = body ?? {};

    const amountNumber = Number(amount);
    if (!organization || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const entry = await updateDonationEntry(session.user.id, id, {
      organization: String(organization),
      amount: amountNumber,
      currency: currency === "USD" ? "USD" : "ILS",
      type: type === "installments" || type === "oneTime" ? type : "recurring",
      startDate:
        typeof startDate === "string"
          ? startDate
          : new Date().toISOString().slice(0, 10),
      installmentsTotal:
        type === "installments" ? Number(installmentsTotal) || null : null,
      installmentsPaid:
        type === "installments" ? Number(installmentsPaid) || null : null,
      note:
        typeof note === "string" && note.trim().length > 0 ? note.trim() : null,
    });

    await logDonationActivity(
      session.user.id,
      "UPDATE",
      id,
      `Updated donation: ${entry.organization}`,
      request
    );
    return NextResponse.json({ donation: entry });
  } catch (error) {
    console.error("Failed to update donation", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
