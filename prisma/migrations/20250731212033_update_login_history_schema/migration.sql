/*
  Warnings:

  - You are about to drop the column `deviceInfo` on the `login_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "login_history" DROP COLUMN "deviceInfo",
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "ipAddress" DROP NOT NULL;
