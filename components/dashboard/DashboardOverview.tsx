"use client";

import { CalendarDays, Coins, Gauge, HandCoins, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import type { UserFinancialSettings } from "@/lib/financial-data";
import { cn } from "@/lib/utils";
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
		donations: number;
		obligation: number;
		balance: number;
		convertedTotal: number;
		convertedCount: number;
	};
};


const VIEW_MODES: ViewMode[] = ["monthly", "yearly"];

function computeYearSnapshot(snapshot: YearSnapshot): ComputedYear {
	let runningBalance = snapshot.startingBalance;
	const months: ComputedMonth[] = snapshot.monthly.map((month) => {
		const obligation = month.incomesBase * snapshot.tithePercent;
		runningBalance = runningBalance + month.donationsBase - obligation;
		const progress = obligation === 0 ? 0 : Math.min(1, month.donationsBase / obligation);
		return {
			...month,
			obligation,
			runningBalance,
			progress,
		};
	});

	const totals = months.reduce(
		(acc, month) => {
			acc.income += month.incomesBase;
			acc.donations += month.donationsBase;
			acc.obligation += month.obligation;
			acc.balance = month.runningBalance;
			acc.convertedTotal += month.convertedTotal;
			acc.convertedCount += month.convertedEntries;
			return acc;
		},
		{ income: 0, donations: 0, obligation: 0, balance: snapshot.startingBalance, convertedTotal: 0, convertedCount: 0 },
	);

	return { year: snapshot, months, totals };
}

export function DashboardOverview() {
	const locale = useLocale();
	const localePrefix = `/${locale}`;
	const t = useTranslations("dashboard");
	const tCommon = useTranslations("common");
	const tMonths = useTranslations("months");
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
			if (!response.ok) {
				throw new Error(`Failed to load dashboard overview: ${response.status}`);
			}

			const data: { years?: YearSnapshot[] | null; settings?: UserFinancialSettings | null } = await response.json();
			setSnapshots(Array.isArray(data?.years) ? data.years : []);
			setSettings(data?.settings ?? null);
		} catch (error) {
			console.error("Failed to load dashboard overview", error);
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

	const orderedSnapshots = useMemo(
		() =>
			snapshots
				.slice()
				.sort((a, b) => b.year - a.year),
		[snapshots],
	);

	const yearOptions = useMemo(() => orderedSnapshots.map((snapshot) => snapshot.year), [orderedSnapshots]);

	const [selectedYear, setSelectedYear] = useState<number>(() => yearOptions[0] ?? new Date().getFullYear());
	const [viewMode, setViewMode] = useState<ViewMode>("monthly");
	const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);

	useEffect(() => {
		if (yearOptions.length > 0 && !yearOptions.includes(selectedYear)) {
			setSelectedYear(yearOptions[0]);
		}
	}, [selectedYear, yearOptions]);

	const snapshot = useMemo(
		() => orderedSnapshots.find((item) => item.year === selectedYear) ?? null,
		[selectedYear, orderedSnapshots],
	);

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
		if (!computedYear || months.length === 0) {
			return null;
		}
		if (!selectedMonthId) {
			return months[0];
		}
		const found = months.find((month) => month.id === selectedMonthId);
		if (!found) {
			return months[0];
		}
		return found;
	}, [computedYear, months, selectedMonthId]);

	if (isLoading) {
		return (
			<Card className="border-dashed border-border/60 bg-muted/20">
				<CardHeader className="space-y-2 text-center">
					<CardTitle>{t("overview.heading", { year: selectedYear })}</CardTitle>
					<CardDescription>{tCommon("loading")}</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-center py-6 text-sm text-muted-foreground">
					{tCommon("loading")}
				</CardContent>
			</Card>
		);
	}

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

	const currencyLabel = year.baseCurrency === "ILS" ? t("baseCurrency.labels.ils") : t("baseCurrency.labels.usd");

	// const convertedMonths = months.filter((month) => month.convertedEntries > 0);

	const metrics = viewMode === "yearly"
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

	const helperContext = viewMode === "yearly"
		? t("cards.helperYearly", { currency: currencyLabel })
		: t("cards.helperMonthly", {
			month: tMonths(MONTH_KEYS[selectedMonth?.monthIndex ?? 0]),
			currency: currencyLabel,
		});

	return (
		<div className="space-y-4 sm:space-y-6 md:space-y-8">
			{/* Header Section - Mobile-First Responsive */}
			<div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-1.5 sm:space-y-2 md:space-y-3">
					<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:gap-2 sm:px-3 md:text-sm">
						<CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
						{t("overview.badge", { year: selectedYear })}
					</span>
					<h1 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-4xl leading-tight">
						{t("overview.heading", { year: selectedYear })}
					</h1>
					<p className="text-xs text-muted-foreground sm:text-sm md:text-base md:max-w-2xl leading-relaxed">
						{t("overview.subheading", { currency: currencyLabel })}
					</p>
					<div className="flex flex-col gap-1.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 md:text-sm">
						<div className="flex items-center gap-1.5 sm:gap-2">
							<Coins className="h-3 w-3 text-primary sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
							<span>{t("overview.tithePercent", { percent: Math.round(year.tithePercent * 100) })}</span>
						</div>
						<div className="flex items-center gap-1.5 sm:gap-2">
							<HandCoins className="h-3 w-3 text-primary sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
							<span>{t(`overview.carryStrategy.${year.carryStrategy}`)}</span>
						</div>
					</div>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:flex-col lg:items-end xl:flex-row xl:items-center">
					<label className="flex flex-col gap-1 text-xs font-medium sm:flex-row sm:items-center sm:gap-2 md:text-sm">
						<span className="whitespace-nowrap">{t("overview.yearPickerLabel")}</span>
						<select
							className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[90px] sm:px-3 sm:py-2"
							value={selectedYear}
							onChange={(event) => setSelectedYear(Number(event.target.value))}
						>
							{yearOptions.map((yearOption) => (
								<option key={yearOption} value={yearOption}>
									{yearOption}
								</option>
							))}
						</select>
					</label>
					<div className="flex rounded-lg border border-border bg-muted/40 p-1">
						{VIEW_MODES.map((mode) => (
							<button
								type="button"
								key={mode}
								onClick={() => setViewMode(mode)}
								className={cn(
									"flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition sm:gap-2 sm:px-3 md:text-sm",
									mode === viewMode ? "bg-background text-foreground shadow" : "text-muted-foreground",
								)}
							>
								<TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
								<span className="whitespace-nowrap">{t(`viewModes.${mode}`)}</span>
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Metrics Cards - Mobile-First Responsive Grid */}
			<div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="hover:shadow-sm transition-shadow p-3 sm:p-0">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 sm:p-6 sm:pb-2">
						<CardTitle className="text-xs font-medium sm:text-sm">{t("cards.income.title")}</CardTitle>
						<Wallet className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
					</CardHeader>
					<CardContent className="pb-0 pt-1 p-0 sm:p-6 sm:pt-0 sm:pb-3">
						<div className="text-base font-bold sm:text-lg lg:text-xl">
							{formatCurrency(metrics.income, year.baseCurrency, locale)}
						</div>
						<p className="text-[10px] text-muted-foreground sm:text-xs line-clamp-2">{helperContext}</p>
					</CardContent>
				</Card>
				<Card className="hover:shadow-sm transition-shadow p-3 sm:p-0">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 sm:p-6 sm:pb-2">
						<CardTitle className="text-xs font-medium sm:text-sm">{t("cards.obligation.title")}</CardTitle>
						<Gauge className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
					</CardHeader>
					<CardContent className="pb-0 pt-1 p-0 sm:p-6 sm:pt-0 sm:pb-3">
						<div className="text-base font-bold sm:text-lg lg:text-xl">
							{formatCurrency(metrics.obligation, year.baseCurrency, locale)}
						</div>
						<p className="text-[10px] text-muted-foreground sm:text-xs line-clamp-2">{t("cards.obligation.helper", { percent: Math.round(year.tithePercent * 100) })}</p>
					</CardContent>
				</Card>
				<Card className="hover:shadow-sm transition-shadow p-3 sm:p-0">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 sm:p-6 sm:pb-2">
						<CardTitle className="text-xs font-medium sm:text-sm">{t("cards.donations.title")}</CardTitle>
						<HandCoins className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
					</CardHeader>
					<CardContent className="pb-0 pt-1 p-0 sm:p-6 sm:pt-0 sm:pb-3">
						<div className="text-base font-bold sm:text-lg lg:text-xl">
							{formatCurrency(metrics.donations, year.baseCurrency, locale)}
						</div>
						<p className="text-[10px] text-muted-foreground sm:text-xs line-clamp-2">{t("cards.donations.helper")}</p>
					</CardContent>
				</Card>
				<Card className="hover:shadow-sm transition-shadow p-3 sm:p-0">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 sm:p-6 sm:pb-2">
						<CardTitle className="text-xs font-medium sm:text-sm">{t("cards.balance.title")}</CardTitle>
						<Coins className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
					</CardHeader>
					<CardContent className="pb-0 pt-1 p-0 sm:p-6 sm:pt-0 sm:pb-3">
						<div className="text-base font-bold sm:text-lg lg:text-xl">
							{formatCurrency(metrics.balance, year.baseCurrency, locale)}
						</div>
						<p className="text-[10px] text-muted-foreground sm:text-xs line-clamp-2">
							{t(metrics.balance >= 0 ? "cards.balance.surplus" : "cards.balance.debt")}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Progress Section - Mobile-Optimized */}
			<Card className="p-3 sm:p-0">
				<CardHeader className="pb-2 p-0 sm:p-6 sm:pb-3">
					<CardTitle className="text-sm sm:text-base">{t("progress.title")}</CardTitle>
					<CardDescription className="text-xs sm:text-sm">{t("progress.description", { scope: t(`viewModes.${viewMode}`) })}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2 p-0 pt-0 sm:space-y-3 sm:p-6 sm:pt-0">
					<div>
						<div className="flex items-center justify-between text-xs font-medium sm:text-sm">
							<span>{t("progress.label")}</span>
							<span className="text-primary font-semibold">{progressPercent}%</span>
						</div>
						<div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
							<div
								className="h-2 rounded-full bg-primary transition-all duration-500 ease-out"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>
					</div>
					<div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
						<div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
							<p className="text-xs text-muted-foreground sm:text-sm">{t("progress.actual")}</p>
							<p className="text-base font-semibold sm:text-lg">
								{formatCurrency(progressActual, year.baseCurrency, locale)}
							</p>
						</div>
						<div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
							<p className="text-xs text-muted-foreground sm:text-sm">{t("progress.target")}</p>
							<p className="text-base font-semibold sm:text-lg">
								{formatCurrency(progressTarget, year.baseCurrency, locale)}
							</p>
						</div>
					</div>
					<p className="text-[10px] text-muted-foreground sm:text-xs">{t("progress.note")}</p>
				</CardContent>
			</Card>

			{/* Monthly Data Table Section - Enhanced Mobile View */}
			<div className="space-y-3 sm:space-y-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<h2 className="text-base font-semibold tracking-tight sm:text-lg">{t("table.title")}</h2>
					<div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1 sm:gap-2">
						{months.map((month) => (
							<button
								key={month.id}
								type="button"
								onClick={() => setSelectedMonthId(month.id)}
								className={cn(
									"flex-shrink-0 rounded-md px-2 py-1.5 text-[10px] font-medium transition whitespace-nowrap sm:px-3 sm:py-2 sm:text-xs md:text-sm",
									month.id === selectedMonth?.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground",
								)}
							>
								{tMonths(MONTH_KEYS[month.monthIndex])}
							</button>
						))}
					</div>
				</div>
				
				{/* Mobile-First Table Design */}
				<div className="block sm:hidden space-y-2">
					{months.map((month) => (
						<Card key={month.id} className={cn(
							"p-3 transition-colors", 
							month.id === selectedMonth?.id && "ring-2 ring-primary/20 bg-primary/5"
						)}>
							<div className="flex items-center justify-between mb-2">
								<h3 className="font-medium text-sm">{tMonths(MONTH_KEYS[month.monthIndex])}</h3>
								<span className={cn(
									"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", 
									month.runningBalance >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
								)}>
									{formatCurrency(month.runningBalance, year.baseCurrency, locale)}
								</span>
							</div>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div>
									<span className="text-muted-foreground">{t("table.columns.income")}: </span>
									<span className="font-medium">{formatCurrency(month.incomesBase, year.baseCurrency, locale)}</span>
								</div>
								<div>
									<span className="text-muted-foreground">{t("table.columns.obligation")}: </span>
									<span className="font-medium">{formatCurrency(month.obligation, year.baseCurrency, locale)}</span>
								</div>
								<div>
									<span className="text-muted-foreground">{t("table.columns.donations")}: </span>
									<span className="font-medium">{formatCurrency(month.donationsBase, year.baseCurrency, locale)}</span>
								</div>
								<div>
									{month.convertedEntries > 0 ? (
										<span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
											{t("table.conversionFlag", { count: month.convertedEntries })}
										</span>
									) : (
										<span className="text-[10px] text-muted-foreground">{t("table.noConversions")}</span>
									)}
								</div>
							</div>
						</Card>
					))}
				</div>

				{/* Desktop Table */}
				<div className="hidden sm:block overflow-x-auto rounded-lg border border-border/60">
					<table className="min-w-full divide-y divide-border/60 text-sm">
						<thead className="bg-muted/50">
							<tr>
								<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs sm:px-4 sm:py-3 sm:text-sm">{t("table.columns.month")}</th>
								<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs sm:px-4 sm:py-3 sm:text-sm">{t("table.columns.income")}</th>
								<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs sm:px-4 sm:py-3 sm:text-sm">{t("table.columns.obligation")}</th>
								<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs sm:px-4 sm:py-3 sm:text-sm">{t("table.columns.donations")}</th>
								<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs sm:px-4 sm:py-3 sm:text-sm">{t("table.columns.balance")}</th>
								<th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs sm:px-4 sm:py-3 sm:text-sm">{t("table.columns.conversions")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border/40">
							{months.map((month) => (
								<tr key={month.id} className={cn(
									"hover:bg-muted/30 transition-colors", 
									month.id === selectedMonth?.id && "bg-muted/30"
								)}> 
									<td className="px-3 py-2 font-medium text-xs sm:px-4 sm:py-3 sm:text-sm">{tMonths(MONTH_KEYS[month.monthIndex])}</td>
									<td className="px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(month.incomesBase, year.baseCurrency, locale)}</td>
									<td className="px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(month.obligation, year.baseCurrency, locale)}</td>
									<td className="px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(month.donationsBase, year.baseCurrency, locale)}</td>
									<td className="px-3 py-2 sm:px-4 sm:py-3">
										<span className={cn(
											"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", 
											month.runningBalance >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
										)}> 
											{formatCurrency(month.runningBalance, year.baseCurrency, locale)}
										</span>
									</td>
									<td className="px-3 py-2 sm:px-4 sm:py-3">
										{month.convertedEntries > 0 ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
												{t("table.conversionFlag", { count: month.convertedEntries })}
											</span>
										) : (
											<span className="text-xs text-muted-foreground">{t("table.noConversions")}</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

export default DashboardOverview;
