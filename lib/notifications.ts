import { DonationType, IncomeSchedule, NotificationType, type Prisma } from "@prisma/client";

import { prismaClient } from "@/lib/prisma";

export type NotificationMetadata = {
  titleKey?: string;
  messageKey?: string;
  params?: Record<string, unknown>;
  entityType?: "donation" | "income" | "system";
  entityId?: string;
  severity?: "info" | "warning" | "critical";
};

export type NotificationDTO = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  contextId: string | null;
  metadata: NotificationMetadata | null;
};

type TxClient = Prisma.TransactionClient;

type DonationWithInstallments = {
  id: string;
  organizationName: string;
  amount: number;
  currency: string;
  installmentsTotal: number | null;
  installmentsPaid: number | null;
};

type VariableIncomeMultiMonth = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  totalMonths: number | null;
};

const FINAL_INSTALLMENT_THRESHOLD = 1;

let notificationsSchemaEnsured = false;
let notificationsSchemaEnsuring: Promise<void> | null = null;

async function ensureNotificationSchema() {
  if (notificationsSchemaEnsured) {
    return;
  }

  if (!notificationsSchemaEnsuring) {
    notificationsSchemaEnsuring = (async () => {
      try {
        // Ensure the enum value exists (PostgreSQL specific)
        await prismaClient.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_type t
              JOIN pg_enum e ON t.oid = e.enumtypid
              WHERE t.typname = 'NotificationType'
                AND e.enumlabel = 'INCOME_ENDING'
            ) THEN
              ALTER TYPE "NotificationType" ADD VALUE 'INCOME_ENDING';
            END IF;
          END
          $$;
        `);

        // Ensure the columns exist
        await prismaClient.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'notification'
                AND column_name = 'contextId'
            ) THEN
              ALTER TABLE "notification" ADD COLUMN "contextId" TEXT;
            END IF;

            IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'notification'
                AND column_name = 'metadata'
            ) THEN
              ALTER TABLE "notification" ADD COLUMN "metadata" JSONB;
            END IF;
          END
          $$;
        `);

        // Ensure supporting indexes exist
        await prismaClient.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "notification_userId_createdAt_idx"
          ON "notification" ("userId", "createdAt");
        `);

        await prismaClient.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM pg_indexes
              WHERE schemaname = 'public'
                AND indexname = 'notification_userId_type_key'
            ) THEN
              DROP INDEX "notification_userId_type_key";
            END IF;
          END
          $$;
        `);

        await prismaClient.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "notification_userId_type_contextId_key"
          ON "notification" ("userId", "type", "contextId");
        `);

        notificationsSchemaEnsured = true;
      } catch (error) {
        console.error("Failed to ensure notification schema:", error);
      } finally {
        notificationsSchemaEnsuring = null;
      }
    })();
  }

  const ensuringPromise = notificationsSchemaEnsuring;
  if (ensuringPromise) {
    await ensuringPromise;
  }
}

function toJson(metadata: NotificationMetadata): Prisma.InputJsonObject {
  return metadata as Prisma.InputJsonObject;
}

function differenceInCalendarMonths(target: Date, start: Date): number {
  return target.getFullYear() * 12 + target.getMonth() - (start.getFullYear() * 12 + start.getMonth());
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

async function ensureInstallmentNotifications(tx: TxClient, userId: string) {
  const donations = await tx.donation.findMany({
    where: {
      userId,
      donationType: DonationType.INSTALLMENTS,
      isActive: true,
      installmentsTotal: { not: null },
      installmentsPaid: { not: null },
    },
    select: {
      id: true,
      organizationName: true,
      amount: true,
      currency: true,
      installmentsTotal: true,
      installmentsPaid: true,
    },
  });

  await Promise.all(
    donations.map(async (donation: DonationWithInstallments) => {
      const total = donation.installmentsTotal ?? 0;
      const paid = donation.installmentsPaid ?? 0;
      const remaining = Math.max(total - paid, 0);

      if (total <= 0 || remaining !== FINAL_INSTALLMENT_THRESHOLD) {
        return;
      }

      const metadata: NotificationMetadata = {
        titleKey: "notifications.installments.finalPayment.title",
        messageKey: "notifications.installments.finalPayment.body",
        params: {
          organization: donation.organizationName,
          totalInstallments: total,
          amount: donation.amount,
          currency: donation.currency,
        },
        entityType: "donation",
        entityId: donation.id,
        severity: "warning",
      };

      await tx.notification.upsert({
        where: {
          userId_type_contextId: {
            userId,
            type: NotificationType.FINAL_PAYMENT,
            contextId: donation.id,
          },
        },
        update: {
          title: "Final installment reminder",
          message: `Only one installment remains for ${donation.organizationName}`,
          metadata: toJson(metadata),
        },
        create: {
          userId,
          type: NotificationType.FINAL_PAYMENT,
          contextId: donation.id,
          title: "Final installment reminder",
          message: `Only one installment remains for ${donation.organizationName}`,
          metadata: toJson(metadata),
        },
      });
    }),
  );
}

async function ensureIncomeNotifications(tx: TxClient, userId: string) {
  const incomes = await tx.variableIncome.findMany({
    where: {
      userId,
      schedule: IncomeSchedule.MULTI_MONTH,
      totalMonths: { not: null },
    },
    select: {
      id: true,
      description: true,
      amount: true,
      currency: true,
      date: true,
      totalMonths: true,
    },
  });

  const now = new Date();

  await Promise.all(
    incomes.map(async (income: VariableIncomeMultiMonth) => {
      const totalMonths = income.totalMonths ?? 0;
      if (totalMonths <= 0) {
        return;
      }

      const monthsSinceStart = differenceInCalendarMonths(now, income.date);
      if (monthsSinceStart < 0) {
        // Income hasn't started yet
        return;
      }

      const monthsRemaining = totalMonths - (monthsSinceStart + 1);
      if (monthsRemaining !== 0) {
        // We only alert on the final month
        return;
      }

      const endDate = addMonths(income.date, totalMonths - 1);

      const metadata: NotificationMetadata = {
        titleKey: "notifications.incomes.lastMonth.title",
        messageKey: "notifications.incomes.lastMonth.body",
        params: {
          description: income.description,
          amount: income.amount,
          currency: income.currency,
          endDate: endDate.toISOString(),
        },
        entityType: "income",
        entityId: income.id,
        severity: "warning",
      };

      await tx.notification.upsert({
        where: {
          userId_type_contextId: {
            userId,
            type: NotificationType.INCOME_ENDING,
            contextId: income.id,
          },
        },
        update: {
          title: "Limited income is ending",
          message: `${income.description} is in its final month`,
          metadata: toJson(metadata),
        },
        create: {
          userId,
          type: NotificationType.INCOME_ENDING,
          contextId: income.id,
          title: "Limited income is ending",
          message: `${income.description} is in its final month`,
          metadata: toJson(metadata),
        },
      });
    }),
  );
}

export async function ensureSystemNotifications(userId: string) {
  await ensureNotificationSchema();
  await prismaClient.$transaction(async (tx) => {
    await ensureInstallmentNotifications(tx, userId);
    await ensureIncomeNotifications(tx, userId);
  });
}

export async function getNotificationsForUser(userId: string) {
  await ensureNotificationSchema();
  const notifications = await prismaClient.notification.findMany({
    where: { userId },
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
  });

  const items: NotificationDTO[] = notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
    contextId: notification.contextId ?? null,
    metadata: (notification.metadata as NotificationMetadata | null) ?? null,
  }));

  const unreadCount = items.reduce((acc, item) => (item.isRead ? acc : acc + 1), 0);

  return { notifications: items, unreadCount };
}

export async function markNotificationsRead(userId: string, ids: string[], isRead: boolean) {
  await ensureNotificationSchema();
  if (!ids.length) {
    return { updated: 0 };
  }

  const result = await prismaClient.notification.updateMany({
    where: {
      userId,
      id: { in: ids },
    },
    data: {
      isRead,
    },
  });

  return { updated: result.count };
}

export async function markAllNotificationsRead(userId: string) {
  await ensureNotificationSchema();
  const result = await prismaClient.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}

export async function deleteNotifications(userId: string, ids: string[]) {
  await ensureNotificationSchema();
  if (!ids.length) {
    return { deleted: 0 };
  }

  const result = await prismaClient.notification.deleteMany({
    where: {
      userId,
      id: { in: ids },
    },
  });

  return { deleted: result.count };
}
