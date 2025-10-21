import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { NotificationsCenter } from "@/components/dashboard/NotificationsCenter";
import { auth } from "@/lib/auth";
import {
  ensureSystemNotifications,
  getNotificationsForUser,
} from "@/lib/notifications";
import { getPageMetadata } from "@/lib/seo";

type NotificationsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: NotificationsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return getPageMetadata(locale, "dashboardNotifications");
}

export default async function NotificationsPage({ params }: NotificationsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user) {
    redirect(`/${locale}/signin`);
  }

  await ensureSystemNotifications(session.user.id);
  const payload = await getNotificationsForUser(session.user.id);

  return (
    <NotificationsCenter
      initialNotifications={payload.notifications}
      initialUnreadCount={payload.unreadCount}
    />
  );
}
