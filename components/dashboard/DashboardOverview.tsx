"use client";

import { CalendarDays, Coins, Gauge, HandCoins, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MobileYearlyMonthsList } from "@/components/dashboard/MobileYearlyMonthsList";
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

	const allYearMonths = useMemo(() => {
		if (!year) {
			return [];
		}
		const existingMonths = new Map(months.map((m) => [m.monthIndex, m]));
		return Array.from({ length: 12 }, (_, i) => {
			const monthData = existingMonths.get(i);
			const hasData = !!monthData && (monthData.incomesBase > 0 || monthData.donationsBase > 0);
			return {
				monthIndex: i,
				id: monthData?.id ?? `month-${i}`,
				hasData: hasData,
			};
		});
	}, [year, months]);

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
		<>
			{/* Mobile-First Design - Completely Different Layout */}
			<div className="block md:hidden space-y-4">
				{/* Simple Mobile Header with Year Dropdown */}
				<div className="mb-4 flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<div>
							<span className="text-xs text-muted-foreground">{t("overview.yearPickerLabel")}</span>
							<div className="flex items-center gap-1">
								<CalendarDays className="h-4 w-4 text-primary" />
								<h1 className="text-xl font-bold">{selectedYear}</h1>
							</div>
						</div>
						<select
							className="rounded-md border border-border bg-background px-2 py-1 text-sm"
							value={selectedYear}
							onChange={(event) => setSelectedYear(Number(event.target.value))}
						>
							{yearOptions.map((yearOption) => (
								<option key={yearOption} value={yearOption}>
									{yearOption}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Mobile Simple Mode Toggle */}
				<div className="mb-3 flex">
					{VIEW_MODES.map((mode) => (
						<button
							type="button"
							key={mode}
							onClick={() => setViewMode(mode)}
							className={cn(
								"flex-1 py-2 text-sm font-medium border-b-2 transition-all",
								mode === viewMode 
									? "border-primary text-primary" 
									: "border-transparent text-muted-foreground",
							)}
						>
							{t(`viewModes.${mode}`)}
						</button>
					))}
				</div>

				{/* Mobile Balance Summary - Main indicator */}
				<div className="mb-3 bg-muted/20 p-3 rounded-md border border-border">
					<div className="flex justify-between items-center">
						<div className="flex flex-col">
							<span className="text-xs text-muted-foreground">{t("cards.balance.title")}</span>
							<span className="text-xl font-semibold">{formatCurrency(metrics.balance, year.baseCurrency, locale)}</span>
						</div>
						<div className={cn(
							"px-3 py-1 rounded-full text-sm",
							metrics.balance >= 0 
								? "bg-emerald-500/10 text-emerald-600" 
								: "bg-red-500/10 text-red-600"
						)}>
							{metrics.balance < 0 ? <span>-{formatCurrency(Math.abs(metrics.balance), year.baseCurrency, locale)}</span> : <span>+{formatCurrency(metrics.balance, year.baseCurrency, locale)}</span>}
						</div>
					</div>
				</div>

				{/* Main Financial Summary */}
				<div className="mb-5">
					{/* Obligations & Progress Section */}
					<div className="mb-3 bg-white rounded-md border border-border p-3">
						<div className="flex justify-between items-center mb-1.5">
							<div>
								<div className="text-xs text-muted-foreground">{t("progress.title")}</div>
								<div className="text-sm font-medium">{t("cards.obligation.title")}</div>
							</div>
							<div className="text-primary font-semibold">{formatCurrency(metrics.obligation, year.baseCurrency, locale)}</div>
						</div>
						
						{/* Progress Bar */}
						<div className="mt-2">
							<div className="flex justify-between items-center text-xs mb-1.5">
								<span className="font-medium">{progressPercent}%</span>
								<span>{formatCurrency(progressActual, year.baseCurrency, locale)} / {formatCurrency(progressTarget, year.baseCurrency, locale)}</span>
							</div>
							<div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
								<div
									className="h-2 bg-primary rounded-full"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
						</div>
					</div>

					{/* Income & Donation Summary */}
					<div className="grid grid-cols-2 gap-3">
						<div className="bg-white rounded-md border border-border p-3">
							<div className="text-xs text-muted-foreground mb-1">{t("cards.income.title")}</div>
							<div className="font-semibold">{formatCurrency(metrics.income, year.baseCurrency, locale)}</div>
						</div>
						<div className="bg-white rounded-md border border-border p-3">
							<div className="text-xs text-muted-foreground mb-1">{t("cards.donations.title")}</div>
							<div className="font-semibold">{formatCurrency(metrics.donations, year.baseCurrency, locale)}</div>
						</div>
					</div>
				</div>

				{/* Mobile Monthly Navigator */}
				{viewMode === "monthly" && (
					<div className="mb-4">
						<h3 className="text-sm font-semibold mb-2">{t("table.title")}</h3>
						<select
							value={selectedMonth?.id ?? ""}
							onChange={(e) => setSelectedMonthId(e.target.value)}
							className="w-full rounded-md border border-border/60 bg-muted/30 p-2 text-sm font-medium transition-all"
						>
							{allYearMonths.map((monthOption) => (
								<option
									key={monthOption.monthIndex}
									value={monthOption.id}
									disabled={!monthOption.hasData}
								>
									{tMonths(MONTH_KEYS[monthOption.monthIndex])}{" "}
									{!monthOption.hasData ? `(${t("empty.noData")})` : ""}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Mobile Monthly Details */}
				{viewMode === "monthly" && selectedMonth && (
					<div className="space-y-3">
						<div className="rounded-xl bg-gradient-to-br from-muted/80 to-background/90 border border-border/60 p-4">
							<div className="flex items-center justify-between mb-3">
								<h4 className="font-semibold">{tMonths(MONTH_KEYS[selectedMonth.monthIndex])}</h4>
								<span className={cn(
									"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
									selectedMonth.runningBalance >= 0 
										? "bg-emerald-500/20 text-emerald-700" 
										: "bg-destructive/20 text-destructive"
								)}>
									{selectedMonth.runningBalance >= 0 ? "+" : ""}
									{formatCurrency(selectedMonth.runningBalance, year.baseCurrency, locale)}
								</span>
							</div>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="text-muted-foreground block mb-1">{t("table.columns.income")}</span>
									<span className="font-semibold">{formatCurrency(selectedMonth.incomesBase, year.baseCurrency, locale)}</span>
								</div>
								<div>
									<span className="text-muted-foreground block mb-1">{t("table.columns.obligation")}</span>
									<span className="font-semibold">{formatCurrency(selectedMonth.obligation, year.baseCurrency, locale)}</span>
								</div>
								<div>
									<span className="text-muted-foreground block mb-1">{t("table.columns.donations")}</span>
									<span className="font-semibold">{formatCurrency(selectedMonth.donationsBase, year.baseCurrency, locale)}</span>
								</div>
								<div>
									<span className="text-muted-foreground block mb-1">{t("table.columns.conversions")}</span>
									{selectedMonth.convertedEntries > 0 ? (
										<span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-700">
											{selectedMonth.convertedEntries}
										</span>
									) : (
										<span className="text-xs text-muted-foreground">{t("table.noConversions")}</span>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Mobile Yearly Summary */}
				{viewMode === "yearly" && (
					<MobileYearlyMonthsList months={months} currency={year.baseCurrency} locale={locale} />
				)}
			</div>

			{/* Desktop Design - Original Layout */}
			<div className="hidden md:block space-y-6 lg:space-y-8">
				{/* Header Section */}
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="space-y-2 lg:space-y-3">
						<span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
							<CalendarDays className="h-4 w-4" />
							{t("overview.badge", { year: selectedYear })}
						</span>
						<h1 className="text-3xl font-semibold tracking-tight lg:text-4xl leading-tight">
							{t("overview.heading", { year: selectedYear })}
						</h1>
						<p className="text-muted-foreground max-w-2xl leading-relaxed">
							{t("overview.subheading", { currency: currencyLabel })}
						</p>
						<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
							<div className="flex items-center gap-2">
								<Coins className="h-4 w-4 text-primary" />
								<span>{t("overview.tithePercent", { percent: Math.round(year.tithePercent * 100) })}</span>
							</div>
							<div className="flex items-center gap-2">
								<HandCoins className="h-4 w-4 text-primary" />
								<span>{t(`overview.carryStrategy.${year.carryStrategy}`)}</span>
							</div>
						</div>
					</div>
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center xl:flex-row xl:items-center">
						<label className="flex items-center gap-2 text-sm font-medium">
							<span className="whitespace-nowrap">{t("overview.yearPickerLabel")}</span>
							<select
								className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
										"flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
										mode === viewMode ? "bg-background text-foreground shadow" : "text-muted-foreground",
									)}
								>
									<TrendingUp className="h-4 w-4" />
									<span className="whitespace-nowrap">{t(`viewModes.${mode}`)}</span>
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Metrics Cards */}
				<div className="grid gap-4 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">{t("cards.income.title")}</CardTitle>
							<Wallet className="h-4 w-4 text-primary" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{formatCurrency(metrics.income, year.baseCurrency, locale)}
							</div>
							<p className="text-xs text-muted-foreground">{helperContext}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">{t("cards.obligation.title")}</CardTitle>
							<Gauge className="h-4 w-4 text-primary" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{formatCurrency(metrics.obligation, year.baseCurrency, locale)}
							</div>
							<p className="text-xs text-muted-foreground">{t("cards.obligation.helper", { percent: Math.round(year.tithePercent * 100) })}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">{t("cards.donations.title")}</CardTitle>
							<HandCoins className="h-4 w-4 text-primary" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{formatCurrency(metrics.donations, year.baseCurrency, locale)}
							</div>
							<p className="text-xs text-muted-foreground">{t("cards.donations.helper")}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">{t("cards.balance.title")}</CardTitle>
							<Coins className="h-4 w-4 text-primary" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{formatCurrency(metrics.balance, year.baseCurrency, locale)}
							</div>
							<p className="text-xs text-muted-foreground">
								{t(metrics.balance >= 0 ? "cards.balance.surplus" : "cards.balance.debt")}
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Progress Section */}
				<Card>
					<CardHeader>
						<CardTitle>{t("progress.title")}</CardTitle>
						<CardDescription>{t("progress.description", { scope: t(`viewModes.${viewMode}`) })}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<div className="flex items-center justify-between text-sm font-medium">
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
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
								<p className="text-sm text-muted-foreground">{t("progress.actual")}</p>
								<p className="text-lg font-semibold">
									{formatCurrency(progressActual, year.baseCurrency, locale)}
								</p>
							</div>
							<div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
								<p className="text-sm text-muted-foreground">{t("progress.target")}</p>
								<p className="text-lg font-semibold">
									{formatCurrency(progressTarget, year.baseCurrency, locale)}
								</p>
							</div>
						</div>
						<p className="text-xs text-muted-foreground">{t("progress.note")}</p>
					</CardContent>
				</Card>

				{/* Desktop Table */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold tracking-tight">{t("table.title")}</h2>
						<div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-1">
							{months.map((month) => (
								<button
									key={month.id}
									type="button"
									onClick={() => setSelectedMonthId(month.id)}
									className={cn(
										"rounded-md px-3 py-2 text-sm font-medium transition whitespace-nowrap",
										month.id === selectedMonth?.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground",
									)}
								>
									{tMonths(MONTH_KEYS[month.monthIndex])}
								</button>
							))}
						</div>
					</div>
					
					<div className="overflow-x-auto rounded-lg border border-border/60">
						<table className="min-w-full divide-y divide-border/60 text-sm">
							<thead className="bg-muted/50">
								<tr>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.month")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.income")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.obligation")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.donations")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.balance")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.conversions")}</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/40">
								{months.map((month) => (
									<tr key={month.id} className={cn(
										"hover:bg-muted/30 transition-colors", 
										month.id === selectedMonth?.id && "bg-muted/30"
									)}> 
										<td className="px-4 py-3 font-medium">{tMonths(MONTH_KEYS[month.monthIndex])}</td>
										<td className="px-4 py-3">{formatCurrency(month.incomesBase, year.baseCurrency, locale)}</td>
										<td className="px-4 py-3">{formatCurrency(month.obligation, year.baseCurrency, locale)}</td>
										<td className="px-4 py-3">{formatCurrency(month.donationsBase, year.baseCurrency, locale)}</td>
										<td className="px-4 py-3">
											<span className={cn(
												"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", 
												month.runningBalance >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
											)}> 
												{formatCurrency(month.runningBalance, year.baseCurrency, locale)}
											</span>
										</td>
										<td className="px-4 py-3">
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
		</>
	);
}

export default DashboardOverview;
