import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logDonationActivity } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";
import {
  deleteDonationEntry,
  updateDonationEntry,
  type ScopedDeleteOptions,
  type ScopedUpdateOptions,
} from "@/lib/financial-data";

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

  let payload: ScopedDeleteOptions | undefined;
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      payload = (await request.json()) as ScopedDeleteOptions;
    } catch (error) {
      console.warn("Failed to parse donation delete payload", error);
    }
  }

  try {
    const result = await deleteDonationEntry(session.user.id, id, payload);

    const mode = payload?.mode ?? "all";
    const description =
      mode === "forward"
        ? "Trimmed recurring donation from current month onward"
        : mode === "range"
          ? "Trimmed recurring donation to selected range"
          : "Deleted donation entry";

    await logDonationActivity(
      session.user.id,
      "DELETE",
      id,
      description,
      request
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to delete donation entry", error);
    const message =
      error instanceof Error &&
      (error.message.includes("INVALID") || error.message.includes("RANGE"))
        ? "Invalid request"
        : "Failed to delete donation";
    const status = message === "Invalid request" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
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
      scope,
    } = body ?? {};

    const amountNumber = Number(amount);
    if (!organization || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const scopePayload =
      scope && typeof scope === "object"
        ? (scope as ScopedUpdateOptions)
        : undefined;

    const entry = await updateDonationEntry(
      session.user.id,
      id,
      {
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
      },
      scopePayload
    );

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
