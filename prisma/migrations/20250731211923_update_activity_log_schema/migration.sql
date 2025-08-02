/*
  Warnings:

  - You are about to drop the column `action` on the `user_activity_log` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_activity_log` table. All the data in the column will be lost.
  - Added the required column `activityType` to the `user_activity_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `user_activity_log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_activity_log" DROP COLUMN "action",
DROP COLUMN "createdAt",
ADD COLUMN     "activityType" TEXT NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "page" DROP NOT NULL,
ALTER COLUMN "ipAddress" DROP NOT NULL,
ALTER COLUMN "userAgent" DROP NOT NULL;
