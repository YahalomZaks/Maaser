-- Drop source column from variable_income and remove obsolete enum
ALTER TABLE "variable_income" DROP COLUMN "source";

DROP TYPE "IncomeSource";
