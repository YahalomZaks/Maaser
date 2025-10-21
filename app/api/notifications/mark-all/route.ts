import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/notifications";

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await markAllNotificationsRead(session.user.id);
  return NextResponse.json({ success: true, ...result });
}
