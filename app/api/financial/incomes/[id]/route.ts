import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { logIncomeActivity } from "@/lib/activity-logger";
import { deleteVariableIncomeEntry } from "@/lib/financial-data";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deleteVariableIncomeEntry(session.user.id, id);
  await logIncomeActivity(session.user.id, "DELETE", id, "Deleted income entry", request);

  return NextResponse.json({ success: true });
}
