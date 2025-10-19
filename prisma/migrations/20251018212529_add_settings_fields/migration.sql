-- CreateEnum
CREATE TYPE "MonthCarryStrategy" AS ENUM ('INDEPENDENT', 'CARRY_FORWARD', 'ASK_ME');

-- AlterEnum
ALTER TYPE "CarryStrategy" ADD VALUE 'CARRY_POSITIVE_ONLY';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "monthCarryStrategy" "MonthCarryStrategy" NOT NULL DEFAULT 'CARRY_FORWARD',
ADD COLUMN     "notifyDebtTwoMonths" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyDonationEnding" BOOLEAN NOT NULL DEFAULT true;
