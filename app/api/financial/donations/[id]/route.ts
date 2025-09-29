import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { logDonationActivity } from "@/lib/activity-logger";
import { auth } from "@/lib/auth";
import { deleteDonationEntry } from "@/lib/financial-data";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deleteDonationEntry(session.user.id, id);
  await logDonationActivity(session.user.id, "DELETE", id, "Deleted donation entry", request);

  return NextResponse.json({ success: true });
}
