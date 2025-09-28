import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { logDonationActivity } from "@/lib/activity-logger";
import { deleteDonationEntry } from "@/lib/financial-data";

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

  await deleteDonationEntry(session.user.id, id);
  await logDonationActivity(session.user.id, "DELETE", id, "Deleted donation entry", request);

  return NextResponse.json({ success: true });
}
