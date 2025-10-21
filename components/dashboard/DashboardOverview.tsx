"use client";

import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  TrendingUp,
  Wallet,
  AlertCircle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BalanceCarryOverPanel } from "@/components/dashboard/BalanceCarryOverPanel";
import { MonthDetailsModal } from "@/components/dashboard/MonthDetailsModal";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { UserFinancialSettings } from "@/lib/financial-data";
import type { MonthlySnapshot, YearSnapshot } from "@/types/finance";

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

type ViewMode = "monthly" | "yearly";

type ComputedMonth = MonthlySnapshot & {
  obligation: number;
  runningBalance: number;
  progress: number;
};

type ComputedYear = {
  year: YearSnapshot;
  months: ComputedMonth[];
  totals: {
    income: number;
    recurringIncome: number;
    variableIncome: number;
    donations: number;
    obligation: number;
    balance: number;
    convertedTotal: number;
    convertedCount: number;
  };
};

function computeYearSnapshot(snapshot: YearSnapshot): ComputedYear {
  let runningBalance = snapshot.startingBalance;
  const months: ComputedMonth[] = snapshot.monthly.map((month) => {
    const obligation = month.incomesBase * snapshot.tithePercent;
    runningBalance = runningBalance + month.donationsBase - obligation;
    const progress = obligation === 0 ? 0 : Math.min(1, month.donationsBase / obligation);
    return { ...month, obligation, runningBalance, progress };
  });

  const totals = months.reduce(
    (acc, month) => {
      acc.income += month.incomesBase;
      acc.recurringIncome += month.recurringIncomeBase ?? 0;
      acc.variableIncome += month.variableIncomeBase ?? 0;
      acc.donations += month.donationsBase;
      acc.obligation += month.obligation;
      acc.balance = month.runningBalance;
      acc.convertedTotal += month.convertedTotal;
      acc.convertedCount += month.convertedEntries;
      return acc;
    },
    {
      income: 0,
      recurringIncome: 0,
      variableIncome: 0,
      donations: 0,
      obligation: 0,
      balance: snapshot.startingBalance,
      convertedTotal: 0,
      convertedCount: 0,
    },
  );

  return { year: snapshot, months, totals };
}

export function DashboardOverview() {
  const locale = useLocale();
  const localePrefix = `/${locale}`;
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tMonths = useTranslations("months");
  const tCarry = useTranslations("dashboard.carryOver");
  const router = useRouter();

  const [snapshots, setSnapshots] = useState<YearSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserFinancialSettings | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const response = await fetch("/api/dashboard/overview");
      if (!response.ok) throw new Error(`Failed to load dashboard overview: ${response.status}`);
      const data: { years?: YearSnapshot[] | null; settings?: UserFinancialSettings | null } = await response.json();
      setSnapshots(Array.isArray(data?.years) ? data.years : []);
      setSettings(data?.settings ?? null);
    } catch (err) {
      console.error("Failed to load dashboard overview", err);
      setFetchError("loadFailed");
      setSnapshots([]);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && settings && !settings.isFirstTimeSetupCompleted) {
      router.replace(`${localePrefix}/onboarding`);
    }
  }, [isLoading, settings, router, localePrefix]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => loadData();
    window.addEventListener("maaser:data-updated", handler);
    return () => window.removeEventListener("maaser:data-updated", handler);
  }, [loadData]);

  const orderedSnapshots = useMemo(() => snapshots.slice().sort((a, b) => b.year - a.year), [snapshots]);
  const yearOptions = useMemo(() => orderedSnapshots.map((s) => s.year), [orderedSnapshots]);

  const [selectedYear, setSelectedYear] = useState<number>(() => yearOptions[0] ?? new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isMonthDetailsOpen, setIsMonthDetailsOpen] = useState(false);
  const [detailsMonthIndex, setDetailsMonthIndex] = useState<number | null>(null);
  const [monthIncomeEntries, setMonthIncomeEntries] = useState<Array<{ id: string; description: string; amount: number }> | null>(null);
  const [monthDonationEntries, setMonthDonationEntries] = useState<Array<{ id: string; organization: string; amount: number }> | null>(null);
  const [monthDetailsTotals, setMonthDetailsTotals] = useState<{ income: number; donations: number } | null>(null);
  const [isMonthDetailsLoading, setIsMonthDetailsLoading] = useState(false);

  useEffect(() => {
    if (yearOptions.length > 0 && !yearOptions.includes(selectedYear)) {
      setSelectedYear(yearOptions[0]);
    }
  }, [selectedYear, yearOptions]);

  const snapshot = useMemo(() => orderedSnapshots.find((i) => i.year === selectedYear) ?? null, [selectedYear, orderedSnapshots]);
  const computedYear = useMemo(() => (snapshot ? computeYearSnapshot(snapshot) : null), [snapshot]);

  useEffect(() => {
    if (!computedYear) {
      setSelectedMonthId(null);
      return;
    }
    const monthsForYear = computedYear.months;
    if (monthsForYear.length === 0) {
      setSelectedMonthId(null);
      return;
    }
    const currentYear = new Date().getFullYear();
    const baseIndex = currentYear === computedYear.year.year ? new Date().getMonth() : 0;
    const initialMonth = monthsForYear[baseIndex] ?? monthsForYear[0];
    setSelectedMonthId(initialMonth?.id ?? null);
  }, [computedYear]);

  const months = useMemo(() => computedYear?.months ?? [], [computedYear]);
  const totals = computedYear?.totals;
  const year = computedYear?.year;

  const hasData = Boolean(computedYear && year && months.length > 0);

  const selectedMonth = useMemo(() => {
    if (!computedYear || months.length === 0) return null;
    if (!selectedMonthId) return months[0];
    const found = months.find((m) => m.id === selectedMonthId);
    return found ?? months[0];
  }, [computedYear, months, selectedMonthId]);

  // earliest data date
  const registrationDate = useMemo(() => {
    if (snapshots.length === 0) return undefined;
    const earliestYear = Math.min(...snapshots.map((s) => s.year));
    const earliestSnapshot = snapshots.find((s) => s.year === earliestYear);
    if (!earliestSnapshot || earliestSnapshot.monthly.length === 0) return undefined;
    const earliestMonthIndex = Math.min(...earliestSnapshot.monthly.map((m) => m.monthIndex));
    return new Date(earliestYear, earliestMonthIndex, 1);
  }, [snapshots]);

  // Month picker helpers
  const tMonthsArr = useMemo(
    () => [
      tMonths("january"),
      tMonths("february"),
      tMonths("march"),
      tMonths("april"),
      tMonths("may"),
      tMonths("june"),
      tMonths("july"),
      tMonths("august"),
      tMonths("september"),
      tMonths("october"),
      tMonths("november"),
      tMonths("december"),
    ],
    [tMonths],
  );

  const gridMonths = useMemo(() => tMonthsArr.map((label, idx) => ({ label, idx })), [tMonthsArr]);
  const [monthPickerYear, setMonthPickerYear] = useState(selectedYear);

  useEffect(() => {
    if (isMonthPickerOpen) setMonthPickerYear(selectedYear);
  }, [isMonthPickerOpen, selectedYear]);

  const selectMonth = (mIndex: number) => {
    const targetSnapshot = orderedSnapshots.find((s) => s.year === monthPickerYear);
    if (!targetSnapshot) return;
    const targetMonth = targetSnapshot.monthly.find((m) => m.monthIndex === mIndex);
    if (targetMonth) {
      setSelectedYear(monthPickerYear);
      setSelectedMonthId(targetMonth.id);
      setIsMonthPickerOpen(false);
    }
  };

  const decMonthPickerYear = () => setMonthPickerYear((y) => y - 1);
  const incMonthPickerYear = () => setMonthPickerYear((y) => y + 1);

  const isMonthDisabled = (monthIndex: number) => {
    if (!registrationDate) return false;
    const checkDate = new Date(monthPickerYear, monthIndex, 1);
    return checkDate < registrationDate;
  };

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const date = new Date(selectedYear, selectedMonth.monthIndex, 1);
    return date.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { year: "numeric", month: "long" });
  }, [selectedMonth, selectedYear, locale]);

  // Year picker helpers
  const YEARS_PER_PAGE = 12;
  const [yearPickerStartYear, setYearPickerStartYear] = useState(() => {
    const currentYear = new Date().getFullYear();
    return Math.floor(currentYear / YEARS_PER_PAGE) * YEARS_PER_PAGE;
  });

  useEffect(() => {
    if (isYearPickerOpen) setYearPickerStartYear(Math.floor(selectedYear / YEARS_PER_PAGE) * YEARS_PER_PAGE);
  }, [isYearPickerOpen, selectedYear]);

  const yearPickerYears = useMemo(() => {
    const years = [];
    for (let i = 0; i < YEARS_PER_PAGE; i++) years.push(yearPickerStartYear + i);
    return years;
  }, [yearPickerStartYear]);

  const decYearPickerPage = () => setYearPickerStartYear((y) => y - YEARS_PER_PAGE);
  const incYearPickerPage = () => setYearPickerStartYear((y) => y + YEARS_PER_PAGE);

  const isYearDisabled = (yr: number) => {
    const currentYear = new Date().getFullYear();
    if (yr > currentYear) return true;
    if (registrationDate && yr < registrationDate.getFullYear()) return true;
    return !yearOptions.includes(yr);
  };

  const selectYear = (yr: number) => {
    if (!isYearDisabled(yr)) {
      setSelectedYear(yr);
      setIsYearPickerOpen(false);
    }
  };

  // details modal
  const handleShowMonthDetails = (monthIndex: number) => {
    setDetailsMonthIndex(monthIndex);
    // Reset previous data and open modal
    setMonthIncomeEntries(null);
    setMonthDonationEntries(null);
    setMonthDetailsTotals(null);
    setIsMonthDetailsLoading(true);
    setIsMonthDetailsOpen(true);
    // Fetch details for the selected year+month
    const y = selectedYear;
    fetch(`/api/dashboard/month-details?year=${y}&month=${monthIndex}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load month details: ${res.status}`);
        return res.json();
      })
      .then((data: {
        currency: string;
        incomes: Array<{ id: string; description: string; amountBase: number }>;
        donations: Array<{ id: string; organization: string; amountBase: number }>;
        totals: { income: number; donations: number };
      }) => {
        setMonthIncomeEntries(data.incomes.map((i) => ({ id: i.id, description: i.description, amount: i.amountBase })));
        setMonthDonationEntries(
          data.donations.map((d) => ({ id: d.id, organization: d.organization, amount: d.amountBase }))
        );
        setMonthDetailsTotals(data.totals);
        setIsMonthDetailsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMonthIncomeEntries([]);
        setMonthDonationEntries([]);
        setMonthDetailsTotals({ income: 0, donations: 0 });
        setIsMonthDetailsLoading(false);
      });
  };

  // carry strategy
  const handleCarryDecision = async (shouldCarry: boolean) => {
    await Promise.resolve();
    return shouldCarry;
  };

  // Prefer explicit month carry strategy from settings; fallback to a reasonable mapping if missing
  let monthCarryStrategy: "CARRY_FORWARD" | "INDEPENDENT" | "ASK_ME" = settings?.monthCarryStrategy ?? "CARRY_FORWARD";
  if (!settings?.monthCarryStrategy) {
    if (settings?.carryStrategy === "RESET") monthCarryStrategy = "INDEPENDENT";
    else if (settings?.carryStrategy === "CARRY_POSITIVE_ONLY") monthCarryStrategy = "ASK_ME";
  }

  if (isLoading) return <LoadingScreen />;

  if (fetchError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="space-y-2 text-center">
          <CardTitle>{tCommon("error")}</CardTitle>
          <CardDescription>{t("errors.loadFailed")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
          <Button variant="outline" onClick={() => loadData()}>
            {t("errors.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasData || !totals || !year) {
    return (
      <Card className="border-dashed border-border/60 bg-muted/20">
        <CardHeader className="space-y-2 text-center">
          <CardTitle>{t("empty.title")}</CardTitle>
          <CardDescription>{t("empty.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
          <p>{t("empty.hint")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href={`${localePrefix}/dashboard/income`}>{t("empty.actions.income")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${localePrefix}/dashboard/donations`}>{t("empty.actions.donations")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressTarget = viewMode === "yearly" ? totals.obligation : selectedMonth?.obligation ?? 0;
  const progressActual = viewMode === "yearly" ? totals.donations : selectedMonth?.donationsBase ?? 0;
  const progressPercent = progressTarget === 0 ? 0 : Math.min(100, Math.round((progressActual / progressTarget) * 100));
  const progressRemaining = Math.max(0, progressTarget - progressActual);
  const progressSurplus = progressActual > progressTarget ? progressActual - progressTarget : 0;

  const metrics =
    viewMode === "yearly"
      ? {
          income: totals.income,
          obligation: totals.obligation,
          donations: totals.donations,
          balance: totals.balance,
        }
      : {
          income: selectedMonth?.incomesBase ?? 0,
          obligation: selectedMonth?.obligation ?? 0,
          donations: selectedMonth?.donationsBase ?? 0,
          balance: selectedMonth?.runningBalance ?? 0,
        };

  const isCurrentMonth = selectedMonth?.monthIndex === new Date().getMonth() && selectedYear === new Date().getFullYear();
  const isDecember = selectedMonth?.monthIndex === 11;
  const isYearComplete = progressPercent >= 100 && isDecember;

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header + view mode toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {viewMode === "monthly" ? t("monthlyView.title") : t("yearlyView.title")}
        </h1>

        <div className="inline-flex rounded-md border bg-background p-0.5 shadow-sm">
          <Button
            variant={viewMode === "monthly" ? "secondary" : "ghost"}
            onClick={() => setViewMode("monthly")}
            className={`gap-2 rounded-md px-3 py-1.5 text-sm ${viewMode === "monthly" ? "bg-[rgba(59,130,246,0.12)] text-[oklch(0.45_0.17_264.4)] border border-[rgba(59,130,246,0.24)]" : ""}`}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t("viewModes.monthly")}</span>
          </Button>
          <Button
            variant={viewMode === "yearly" ? "secondary" : "ghost"}
            onClick={() => setViewMode("yearly")}
            className={`gap-2 rounded-md px-3 py-1.5 text-sm ${viewMode === "yearly" ? "bg-[rgba(59,130,246,0.12)] text-[oklch(0.45_0.17_264.4)] border border-[rgba(59,130,246,0.24)]" : ""}`}
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t("viewModes.yearly")}</span>
          </Button>
        </div>
      </div>

      {/* MONTHLY VIEW */}
      {viewMode === "monthly" && selectedMonth && (
        <div className="space-y-3 sm:space-y-6">
          {/* Month selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen((v) => !v)}
              className="rounded-md border border-border px-2.5 py-1 text-[13px] sm:text-sm font-medium bg-background inline-flex items-center gap-2 hover:bg-muted/50"
            >
              <Calendar className="h-4 w-4" /> {monthLabel}
            </button>
          </div>

          {/* Progress card */}
          <Card>
            <CardHeader className="px-3 py-2 sm:px-6 sm:py-3">
              <CardTitle className="text-sm sm:text-base">{t("progress.title")}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pt-0 pb-3 sm:px-6 sm:pb-6 sm:pt-0 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">{t("monthlyView.stats.obligation")}</span>
                <span className="text-xl sm:text-2xl font-bold">{formatCurrency(metrics.obligation, year.baseCurrency, locale)}</span>
              </div>
              {(() => {
                const bal = metrics.balance ?? 0;
                const isSurplusBal = bal > 0;
                const isDebtBal = bal < 0;
                const absFormatted = formatCurrency(Math.abs(bal), year.baseCurrency, locale);
                let carryMsg: string | null = null;
                if (monthCarryStrategy === "CARRY_FORWARD") {
                  if (isSurplusBal) carryMsg = tCarry("automaticCarry.surplus", { amount: absFormatted });
                  else if (isDebtBal) carryMsg = tCarry("automaticCarry.debt", { amount: absFormatted });
                } else if (monthCarryStrategy === "ASK_ME") {
                  if (isSurplusBal) carryMsg = tCarry("askMe.message", { amount: absFormatted });
                  else if (isDebtBal) carryMsg = tCarry("askMe.debt", { amount: absFormatted });
                } else if (monthCarryStrategy === "INDEPENDENT") {
                  if (isSurplusBal) carryMsg = tCarry("independent.surplus", { amount: absFormatted });
                }
                return (
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base sm:text-lg font-semibold">{progressPercent}%</span>
                      {progressRemaining > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm text-destructive font-medium">
                            נשאר {formatCurrency(progressRemaining, year.baseCurrency, locale)}
                          </span>
                          {carryMsg ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" aria-label={carryMsg} className="inline-flex">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{carryMsg}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </div>
                      ) : progressSurplus > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm text-emerald-600 font-medium">
                            עודף של {formatCurrency(progressSurplus, year.baseCurrency, locale)}
                          </span>
                          {carryMsg ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" aria-label={carryMsg} className="inline-flex">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{carryMsg}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm text-emerald-600 font-medium">הושלם ✓</span>
                          {carryMsg ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" aria-label={carryMsg} className="inline-flex">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{carryMsg}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <Progress value={progressPercent} className="h-2 sm:h-3" />
                  </div>
                );
              })()}
            </CardContent>
          </Card>

            {/* Two small cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Card>
                <CardHeader className="px-3 py-1.5 sm:px-6 sm:py-2 space-y-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium">{t("monthlyView.stats.income")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pt-0 pb-3 sm:px-6 sm:pb-3">
                  <div className="text-lg sm:text-xl font-bold leading-none mb-1">
                    {formatCurrency(metrics.income, year.baseCurrency, locale)}
                  </div>
                  {(selectedMonth?.recurringIncomeBase ?? 0) > 0 || (selectedMonth?.variableIncomeBase ?? 0) > 0 ? (
                    <div className="space-y-0.5 text-[10px] text-muted-foreground">
                      {(selectedMonth?.recurringIncomeBase ?? 0) > 0 ? (
                        <div className="flex justify-between gap-1">
                          <span className="truncate">{t("monthlyView.stats.recurringIncome")}</span>
                          <span className="shrink-0 font-medium">
                            {formatCurrency(selectedMonth?.recurringIncomeBase ?? 0, year.baseCurrency, locale)}
                          </span>
                        </div>
                      ) : null}
                      {(selectedMonth?.variableIncomeBase ?? 0) > 0 ? (
                        <div className="flex justify-between gap-1">
                          <span className="truncate">{t("monthlyView.stats.variableIncome")}</span>
                          <span className="shrink-0 font-medium">
                            {formatCurrency(selectedMonth?.variableIncomeBase ?? 0, year.baseCurrency, locale)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-3 py-1.5 sm:px-6 sm:py-2 space-y-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <HandCoins className="h-3.5 w-3.5 text-muted-foreground" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium">{t("monthlyView.stats.donations")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pt-0 pb-3 sm:px-6 sm:pb-3">
                  <div className="text-lg sm:text-xl font-bold leading-none">{formatCurrency(metrics.donations, year.baseCurrency, locale)}</div>
                </CardContent>
              </Card>
            </div>

          </div>
      )}

      {/* YEARLY VIEW */}
      {viewMode === "yearly" && (
        <div className="space-y-3 sm:space-y-6">
          {/* Year selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsYearPickerOpen((v) => !v)}
              className="rounded-md border border-border px-2.5 py-1 text-[13px] sm:text-sm font-medium bg-background inline-flex items-center gap-2 hover:bg-muted/50"
            >
              <CalendarDays className="h-4 w-4" /> {selectedYear}
            </button>
          </div>

          {/* Year Picker */}
          {isYearPickerOpen ? (
            <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 sm:px-6 pt-28 sm:pt-32 pb-6 overflow-y-auto" aria-modal="true" role="dialog">
              <button aria-label="Dismiss" className="fixed inset-0 bg-black/20" onClick={() => setIsYearPickerOpen(false)} />
              <div className="relative mt-2 w-[min(560px,96%)] max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
                <div className="flex items-center justify-between px-3 py-2">
                  <Button variant="ghost" size="icon" onClick={decYearPickerPage}>
                    <ChevronRight className="h-4 w-4 rtl:hidden" />
                    <ChevronLeft className="h-4 w-4 ltr:hidden" />
                  </Button>
                <div className="text-sm font-semibold">
                    {yearPickerYears[0]} - {yearPickerYears[yearPickerYears.length - 1]}
                  </div>
                  <Button variant="ghost" size="icon" onClick={incYearPickerPage}>
                    <ChevronLeft className="h-4 w-4 rtl:hidden" />
                    <ChevronRight className="h-4 w-4 ltr:hidden" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3 p-3 sm:grid-cols-4" dir={locale === "he" ? "rtl" : "ltr"}>
                  {yearPickerYears.map((yr) => {
                    const disabled = isYearDisabled(yr);
                    const isSelected = yr === selectedYear;
                    let className =
                      "rounded-full border px-4 py-2 text-sm sm:text-base transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ";
                    if (isSelected) className += "border-primary text-primary bg-background";
                    else if (disabled) className += "border-border bg-muted/50 text-muted-foreground cursor-not-allowed";
                    else className += "border-border bg-background hover:bg-muted";
                    return (
                      <button key={yr} onClick={() => !disabled && selectYear(yr)} disabled={disabled} className={className}>
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* Main cards — compact mobile */}
          <div className="space-y-3 sm:space-y-4">
            <Card>
              <CardHeader className="px-3 py-2 sm:px-6 sm:py-3">
                <CardTitle className="text-sm sm:text-base">{t("progress.title")}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pt-0 pb-3 sm:px-6 sm:pb-6 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">{t("yearlyView.stats.estimatedObligation")}</span>
                  <span className="text-xl sm:text-2xl font-bold">{formatCurrency(metrics.obligation, year.baseCurrency, locale)}</span>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-lg font-semibold">{progressPercent}%</span>
                    {progressPercent < 100 ? (
                      <span className="text-xs sm:text-sm text-destructive font-medium">
                        נשאר {formatCurrency(progressTarget - progressActual, year.baseCurrency, locale)}
                      </span>
                    ) : progressActual > progressTarget ? (
                      <span className="text-xs sm:text-sm text-emerald-600 font-medium">
                        עודף של {formatCurrency(progressActual - progressTarget, year.baseCurrency, locale)}
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm text-emerald-600 font-medium">הושלם ✓</span>
                    )}
                  </div>
                  <Progress value={progressPercent} className="h-2 sm:h-3" />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Card>
                <CardHeader className="px-3 py-1.5 sm:px-6 sm:py-2 space-y-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium">הכנסה שנתית</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pt-0 pb-3 sm:px-6 sm:pb-3">
                  <div className="text-lg sm:text-xl font-bold leading-none mb-1">{formatCurrency(metrics.income, year.baseCurrency, locale)}</div>
                  <p className="text-[10px] text-muted-foreground">כל ההכנסות שהוזנו השנה</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-3 py-1.5 sm:px-6 sm:py-2 space-y-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <HandCoins className="h-3.5 w-3.5 text-muted-foreground" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium">סה״כ תרומות</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pt-0 pb-3 sm:px-6 sm:pb-3">
                  <div className="text-lg sm:text-xl font-bold leading-none mb-1">{formatCurrency(metrics.donations, year.baseCurrency, locale)}</div>
                  <p className="text-[10px] text-muted-foreground">כל התרומות שהוזנו השנה</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Monthly breakdown: mobile list + desktop table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("yearlyView.monthlyBreakdown.title")}</CardTitle>
              <CardDescription>{t("yearlyView.monthlyBreakdown.clickForDetails")}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile list (md:hidden) */}
              <div className="md:hidden divide-y rounded-xl border">
                {months.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleShowMonthDetails(m.monthIndex)}
                    className="w-full text-right px-3 py-3 sm:px-4 sm:py-4 hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Badge
                        variant={m.runningBalance >= 0 ? "default" : "destructive"}
                        className={locale === "he" ? "order-2" : "order-1"}
                      >
                        {formatCurrency(m.runningBalance, year.baseCurrency, locale)}
                      </Badge>
                      <div className={cn("text-[13px] sm:text-sm font-semibold", locale === "he" ? "order-1" : "order-2")}>
                        {tMonths(MONTH_KEYS[m.monthIndex])}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 text-[12px] sm:text-sm text-muted-foreground">
                      <div className="text-right">
                        <div>{t("table.columns.income")}</div>
                        <div className="text-foreground font-medium">{formatCurrency(m.incomesBase, year.baseCurrency, locale)}</div>
                      </div>
                      <div className="text-center">
                        <div>{t("table.columns.obligation")}</div>
                        <div className="text-foreground font-medium">{formatCurrency(m.obligation, year.baseCurrency, locale)}</div>
                      </div>
                      <div className="text-left">
                        <div>{t("table.columns.donations")}</div>
                        <div className="text-foreground font-medium">{formatCurrency(m.donationsBase, year.baseCurrency, locale)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.columns.month")}</TableHead>
                      <TableHead className="text-end">{t("table.columns.income")}</TableHead>
                      <TableHead className="text-end">{t("table.columns.obligation")}</TableHead>
                      <TableHead className="text-end">{t("table.columns.donations")}</TableHead>
                      <TableHead className="text-end">{t("table.columns.balance")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {months.map((month) => (
                      <TableRow
                        key={month.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleShowMonthDetails(month.monthIndex)}
                      >
                        <TableCell className="font-medium">{tMonths(MONTH_KEYS[month.monthIndex])}</TableCell>
                        <TableCell className="text-end">{formatCurrency(month.incomesBase, year.baseCurrency, locale)}</TableCell>
                        <TableCell className="text-end">{formatCurrency(month.obligation, year.baseCurrency, locale)}</TableCell>
                        <TableCell className="text-end">{formatCurrency(month.donationsBase, year.baseCurrency, locale)}</TableCell>
                        <TableCell className="text-end"><Badge variant={month.runningBalance >= 0 ? "default" : "destructive"}>{formatCurrency(month.runningBalance, year.baseCurrency, locale)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Year-end carry panel */}
          {isYearComplete && isDecember && (
            <BalanceCarryOverPanel
              balance={metrics.balance}
              currency={year.baseCurrency}
              monthCarryStrategy={monthCarryStrategy}
              isDecember={true}
              isYearComplete={true}
              onCarryDecision={handleCarryDecision}
            />
          )}
        </div>
      )}

      {/* Modals */}
      {detailsMonthIndex !== null && (
        <MonthDetailsModal
          open={isMonthDetailsOpen}
          onOpenChange={setIsMonthDetailsOpen}
          monthIndex={detailsMonthIndex}
          year={selectedYear}
          currency={year.baseCurrency}
          isLoading={isMonthDetailsLoading}
          incomeEntries={monthIncomeEntries ?? []}
          donationEntries={monthDonationEntries ?? []}
          totalIncome={
            monthDetailsTotals?.income ?? months[detailsMonthIndex]?.incomesBase ?? 0
          }
          totalDonations={
            monthDetailsTotals?.donations ?? months[detailsMonthIndex]?.donationsBase ?? 0
          }
          recurringIncome={months[detailsMonthIndex]?.recurringIncomeBase ?? 0}
          variableIncome={months[detailsMonthIndex]?.variableIncomeBase ?? 0}
        />
      )}
    </div>
  );
}

export default DashboardOverview;
