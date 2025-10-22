export type CurrencyCode = "ILS" | "USD";

export type IncomeSchedule = "oneTime" | "recurring" | "multiMonth";

export type DonationType = "oneTime" | "recurring" | "installments";

export type CarryStrategy = "carry" | "reset";

export interface VariableIncome {
  id: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  schedule: IncomeSchedule;
  totalMonths?: number;
  note?: string;
}

export interface DonationEntry {
  id: string;
  organization: string;
  amount: number;
  currency: CurrencyCode;
  type: DonationType;
  startDate: string;
  installmentsTotal?: number;
  installmentsPaid?: number;
  isActive: boolean;
  note?: string;
}

export interface MonthlySnapshot {
  id: string;
  monthIndex: number;
  incomesBase: number;
  recurringIncomeBase: number;
  variableIncomeBase: number;
  donationsBase: number;
  convertedEntries: number;
  convertedTotal: number;
  notes?: string[];
}

export interface YearSnapshot {
  year: number;
  baseCurrency: CurrencyCode;
  tithePercent: number;
  startingBalance: number;
  carryStrategy: CarryStrategy;
  monthly: MonthlySnapshot[];
}
