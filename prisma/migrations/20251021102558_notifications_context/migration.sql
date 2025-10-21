/*
  Warnings:

  - A unique constraint covering the columns `[userId,type,contextId]` on the table `notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INCOME_ENDING';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "contextId" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_userId_type_contextId_key" ON "notification"("userId", "type", "contextId");
