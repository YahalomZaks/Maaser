/*
  Warnings:

  - The values [UNLIMITED,LIMITED] on the enum `DonationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `limitedCurrent` on the `donation` table. All the data in the column will be lost.
  - You are about to drop the column `limitedTotal` on the `donation` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `donation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IncomeSchedule" AS ENUM ('ONE_TIME', 'RECURRING', 'MULTI_MONTH');

-- CreateEnum
CREATE TYPE "IncomeSource" AS ENUM ('SELF', 'SPOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "CarryStrategy" AS ENUM ('CARRY', 'RESET');

-- AlterEnum
BEGIN;
CREATE TYPE "DonationType_new" AS ENUM ('RECURRING', 'INSTALLMENTS', 'ONE_TIME');
ALTER TABLE "donation" ALTER COLUMN "donationType" TYPE "DonationType_new" USING ("donationType"::text::"DonationType_new");
ALTER TYPE "DonationType" RENAME TO "DonationType_old";
ALTER TYPE "DonationType_new" RENAME TO "DonationType";
DROP TYPE "DonationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "donation" DROP COLUMN "limitedCurrent",
DROP COLUMN "limitedTotal",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'ILS',
ADD COLUMN     "installmentsPaid" INTEGER,
ADD COLUMN     "installmentsTotal" INTEGER,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "carryStrategy" "CarryStrategy" NOT NULL DEFAULT 'CARRY',
ADD COLUMN     "fixedPersonalIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "fixedSpouseIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "includeSpouseIncome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tithePercent" DOUBLE PRECISION NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "variable_income" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ILS',
    "source" "IncomeSource" NOT NULL DEFAULT 'SELF',
    "date" TIMESTAMP(3) NOT NULL,
    "schedule" "IncomeSchedule" NOT NULL DEFAULT 'ONE_TIME',
    "totalMonths" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variable_income_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "variable_income_userId_date_idx" ON "variable_income"("userId", "date");

-- CreateIndex
CREATE INDEX "donation_userId_year_month_idx" ON "donation"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "variable_income" ADD CONSTRAINT "variable_income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
