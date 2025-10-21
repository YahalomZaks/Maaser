import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import {
  deleteNotifications,
  ensureSystemNotifications,
  getNotificationsForUser,
  markNotificationsRead,
} from "@/lib/notifications";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return unauthorized();
  }

  await ensureSystemNotifications(session.user.id);
  const payload = await getNotificationsForUser(session.user.id);
  return NextResponse.json(payload);
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ids, isRead } = (body ?? {}) as { ids?: unknown; isRead?: unknown };
  if (!Array.isArray(ids) || typeof isRead !== "boolean") {
    return NextResponse.json({ error: "ids (string[]) and isRead (boolean) are required" }, { status: 400 });
  }

  const normalizedIds = ids.filter((value): value is string => typeof value === "string" && value.length > 0);
  const result = await markNotificationsRead(session.user.id, normalizedIds, isRead);
  return NextResponse.json({ success: true, ...result });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ids } = (body ?? {}) as { ids?: unknown };
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "ids (string[]) is required" }, { status: 400 });
  }

  const normalizedIds = ids.filter((value): value is string => typeof value === "string" && value.length > 0);
  const result = await deleteNotifications(session.user.id, normalizedIds);
  return NextResponse.json({ success: true, ...result });
}
