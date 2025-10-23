import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logIncomeActivity } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";
import {
  deleteVariableIncomeEntry,
  updateVariableIncomeEntry,
  type ScopedDeleteOptions,
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
      console.warn("Failed to parse income delete payload", error);
    }
  }

  try {
    const result = await deleteVariableIncomeEntry(session.user.id, id, payload);

    const mode = payload?.mode ?? "all";
    const description =
      mode === "forward"
        ? "Trimmed recurring income from current month onward"
        : mode === "range"
          ? "Trimmed recurring income to selected range"
          : "Deleted income entry";

    await logIncomeActivity(
      session.user.id,
      "DELETE",
      id,
      description,
      request
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to delete income entry", error);
    const message =
      error instanceof Error &&
      (error.message.includes("INVALID") || error.message.includes("RANGE"))
        ? "Invalid request"
        : "Failed to delete income";
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
      description,
      amount,
      currency,
      date,
      schedule,
      totalMonths,
      note,
    } = body ?? {};

    const amountNumber = Number(amount);
    if (!description || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const entry = await updateVariableIncomeEntry(session.user.id, id, {
      description: String(description),
      amount: amountNumber,
      currency: currency === "USD" ? "USD" : "ILS",
      date:
        typeof date === "string" ? date : new Date().toISOString().slice(0, 10),
      schedule:
        schedule === "recurring" || schedule === "multiMonth"
          ? schedule
          : "oneTime",
      totalMonths:
        schedule === "multiMonth" ? Number(totalMonths) || null : null,
      note:
        typeof note === "string" && note.trim().length > 0 ? note.trim() : null,
    });

    await logIncomeActivity(
      session.user.id,
      "UPDATE",
      id,
      `Updated income: ${entry.description}`,
      request
    );
    return NextResponse.json({ income: entry });
  } catch (error) {
    console.error("Failed to update variable income", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
