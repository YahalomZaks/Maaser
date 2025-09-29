import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logIncomeActivity } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";
import { deleteVariableIncomeEntry } from "@/lib/financial-data";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deleteVariableIncomeEntry(session.user.id, id);
  await logIncomeActivity(session.user.id, "DELETE", id, "Deleted income entry", request);

  return NextResponse.json({ success: true });
}
