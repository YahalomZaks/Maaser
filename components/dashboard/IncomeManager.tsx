"use client";

import { MinusCircle, PlusCircle, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertCurrency, formatCurrency } from "@/lib/finance";
import type { CurrencyCode, IncomeSchedule, IncomeSource, VariableIncome } from "@/types/finance";

const DEFAULT_BASE: CurrencyCode = "ILS";
const scheduleOptions: { value: IncomeSchedule; months?: number }[] = [
	{ value: "oneTime" },
	{ value: "recurring" },
	{ value: "multiMonth" },
];

const sourceOptions: IncomeSource[] = ["self", "spouse", "other"];

interface FixedIncomeState {
	self: number;
	spouse: number;
	includeSpouse: boolean;
	currency: CurrencyCode;
}

interface VariableIncomeFormState {
	description: string;
	amount: string;
	currency: CurrencyCode;
	source: IncomeSource;
	date: string;
	schedule: IncomeSchedule;
	totalMonths: string;
	note: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function IncomeManager() {
	const locale = useLocale();
	const t = useTranslations("income");
	const tCommon = useTranslations("common");

	const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>(DEFAULT_BASE);
	const [tithePercent, setTithePercent] = useState<number>(10);
	const [fixedIncome, setFixedIncome] = useState<FixedIncomeState>({
		self: 0,
		spouse: 0,
		includeSpouse: false,
		currency: DEFAULT_BASE,
	});
	const [variableIncomes, setVariableIncomes] = useState<VariableIncome[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [formState, setFormState] = useState<VariableIncomeFormState>({
		description: "",
		amount: "",
		currency: DEFAULT_BASE,
		source: "other",
		date: todayISO(),
		schedule: "oneTime",
		totalMonths: "1",
		note: "",
	});

	const loadData = useCallback(async () => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/financial/incomes", {
				method: "GET",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error((await response.json())?.error || "Failed to load income data");
			}

			const data = await response.json();
			const settings = data.settings ?? {};
			const nextCurrency = (settings.currency as CurrencyCode) ?? DEFAULT_BASE;
			setBaseCurrency(nextCurrency);
			setTithePercent(Number(settings.tithePercent) || 10);
			setFixedIncome({
				self: Number(settings.fixedIncome?.personal) || 0,
				spouse: Number(settings.fixedIncome?.spouse) || 0,
				includeSpouse: Boolean(settings.fixedIncome?.includeSpouse),
				currency: nextCurrency,
			});
			setVariableIncomes(Array.isArray(data.variableIncomes) ? data.variableIncomes : []);
			setFetchError(null);
		} catch (error) {
			console.error(error);
			const message = error instanceof Error ? error.message : String(error);
			setFetchError(message);
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

		useEffect(() => {
			setFormState((prev) => ({ ...prev, currency: baseCurrency }));
		}, [baseCurrency]);

		useEffect(() => {
			setFixedIncome((prev) => ({ ...prev, currency: baseCurrency }));
		}, [baseCurrency]);

	const titheDecimal = tithePercent / 100;

	const persistSettings = useCallback(
		async (payload: Record<string, unknown>, successMessage?: string) => {
			try {
				setIsSaving(true);
				const response = await fetch("/api/financial/settings", {
					method: "PATCH",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					throw new Error((await response.json())?.error || tCommon("error"));
				}

				if (successMessage) {
					toast.success(successMessage);
				}
			} catch (error) {
				console.error("Failed to update settings", error);
				toast.error(error instanceof Error ? error.message : tCommon("error"));
			} finally {
				setIsSaving(false);
			}
		},
		[tCommon],
	);

	const fixedTotals = useMemo(() => {
		const selfBase = convertCurrency(fixedIncome.self, fixedIncome.currency, baseCurrency);
		const spouseBase = fixedIncome.includeSpouse
			? convertCurrency(fixedIncome.spouse, fixedIncome.currency, baseCurrency)
			: 0;
		return {
			self: selfBase,
			spouse: spouseBase,
			total: selfBase + spouseBase,
		};
	}, [baseCurrency, fixedIncome]);

	const variableTotals = useMemo(() => {
		const totals = variableIncomes.reduce(
			(acc, entry) => {
				const converted = convertCurrency(entry.amount, entry.currency, baseCurrency);
				acc.total += converted;
				if (entry.source === "spouse") {
					acc.spouse += converted;
				} else {
					acc.self += converted;
				}
				if (entry.currency !== baseCurrency) {
					acc.converted += converted;
				}
				return acc;
			},
			{ total: 0, self: 0, spouse: 0, converted: 0 },
		);
		return totals;
	}, [baseCurrency, variableIncomes]);

	const monthlyObligation = (fixedTotals.total + variableTotals.total) * titheDecimal;
	const convertedCount = variableIncomes.filter((income) => income.currency !== baseCurrency).length;

	const handleFixedIncomeChange = (field: keyof FixedIncomeState, value: string | boolean) => {
		setFixedIncome((prev) => {
			const next = {
				...prev,
				[field]: typeof value === "boolean" ? value : Number(value) || 0,
			};
			if (field === "includeSpouse") {
				persistSettings({
					fixedIncome: {
						personal: next.self,
						spouse: next.spouse,
						includeSpouse: next.includeSpouse,
					},
				});
			}
			return next;
		});
	};

	const handleFormChange = (field: keyof VariableIncomeFormState, value: string) => {
		setFormState((prev) => ({ ...prev, [field]: value }));
	};

	const handleFixedIncomeBlur = useCallback(() => {
		persistSettings({
			fixedIncome: {
				personal: fixedIncome.self,
				spouse: fixedIncome.spouse,
				includeSpouse: fixedIncome.includeSpouse,
			},
		});
	}, [fixedIncome, persistSettings]);

	const handleTitheBlur = useCallback(() => {
		persistSettings({ tithePercent });
	}, [persistSettings, tithePercent]);

	const handleBaseCurrencyChange = useCallback(
		(next: CurrencyCode) => {
			setBaseCurrency(next);
			persistSettings({ currency: next });
		},
		[persistSettings],
	);

	const resetForm = () => {
		setFormState({
			description: "",
			amount: "",
			currency: baseCurrency,
			source: "other",
			date: todayISO(),
			schedule: "oneTime",
			totalMonths: "1",
			note: "",
		});
	};

	const handleAddIncome = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const amountNumber = Number(formState.amount);

		if (!formState.description.trim()) {
			toast.error(t("form.errors.descriptionRequired"));
			return;
		}

		if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
			toast.error(t("form.errors.amountPositive"));
			return;
		}

		if (
			formState.schedule === "multiMonth" &&
			(Number(formState.totalMonths) <= 1 || Number.isNaN(Number(formState.totalMonths)))
		) {
			toast.error(t("form.errors.monthsRequired"));
			return;
		}

		const payload = {
			description: formState.description.trim(),
			amount: amountNumber,
			currency: formState.currency,
			source: formState.source,
			date: formState.date,
			schedule: formState.schedule,
			totalMonths: formState.schedule === "multiMonth" ? Number(formState.totalMonths) : null,
			note: formState.note?.trim() || null,
		};

		try {
			setIsSubmitting(true);
			const response = await fetch("/api/financial/incomes", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error((await response.json())?.error || tCommon("error"));
			}

			const data = await response.json();
			if (data?.income) {
				setVariableIncomes((prev) => [data.income as VariableIncome, ...prev]);
			}
			toast.success(t("form.success"));
			resetForm();
		} catch (error) {
			console.error("Failed to add income", error);
			toast.error(error instanceof Error ? error.message : tCommon("error"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRemoveIncome = async (id: string) => {
		try {
			setIsSaving(true);
			const response = await fetch(`/api/financial/incomes/${id}`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error((await response.json())?.error || tCommon("error"));
			}

			setVariableIncomes((prev) => prev.filter((income) => income.id !== id));
			toast.success(t("table.removed"));
		} catch (error) {
			console.error("Failed to remove income", error);
			toast.error(error instanceof Error ? error.message : tCommon("error"));
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[320px] items-center justify-center">
				<p className="text-muted-foreground">{tCommon("loading")}</p>
			</div>
		);
	}

	if (fetchError) {
		return (
			<div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
				<p className="max-w-md text-center text-muted-foreground">{fetchError}</p>
				<Button onClick={loadData}>{tCommon("retry")}</Button>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold tracking-tight">{t("headline")}</h1>
				<p className="max-w-3xl text-muted-foreground">{t("subheadline")}</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-[350px_1fr]">
				<Card className="h-fit border-primary/40 bg-primary/5">
					<CardHeader>
						<CardTitle>{t("settings.title")}</CardTitle>
						<CardDescription>{t("settings.description")}</CardDescription>
						{isSaving && <p className="text-xs font-medium text-primary">{tCommon("saving")}</p>}
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="base-currency">{t("settings.baseCurrency")}</Label>
							<select
								id="base-currency"
								value={baseCurrency}
								onChange={(event) => handleBaseCurrencyChange(event.target.value as CurrencyCode)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							>
								<option value="ILS">{t("settings.baseCurrencyOptions.ils")}</option>
								<option value="USD">{t("settings.baseCurrencyOptions.usd")}</option>
							</select>
							<p className="text-xs text-muted-foreground">{t("settings.baseCurrencyHelper")}</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="tithe-percent">{t("settings.tithePercentLabel")}</Label>
							<Input
								type="number"
								id="tithe-percent"
								min={1}
								max={25}
								value={tithePercent}
								onChange={(event) => setTithePercent(Number(event.target.value) || 0)}
								onBlur={handleTitheBlur}
							/>
							<p className="text-xs text-muted-foreground">{t("settings.tithePercentHelper")}</p>
						</div>

						<div className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground space-y-2">
							<p>{t("settings.conversionNotice", { rate: convertCurrency(1, "USD", "ILS").toFixed(2) })}</p>
							<p className="font-medium text-foreground">{t("settings.recalculateHint")}</p>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>{t("fixed.title")}</CardTitle>
							<CardDescription>{t("fixed.description")}</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="self-income">{t("fixed.self")}</Label>
								<Input
									type="number"
									id="self-income"
									value={fixedIncome.self}
									onChange={(event) => handleFixedIncomeChange("self", event.target.value)}
									onBlur={handleFixedIncomeBlur}
								/>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<Label htmlFor="spouse-income">{t("fixed.spouse")}</Label>
									<label className="flex items-center gap-2 text-xs">
										<input
											type="checkbox"
											checked={fixedIncome.includeSpouse}
											onChange={(event) => handleFixedIncomeChange("includeSpouse", event.target.checked)}
											className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
										/>
										<span>{t("fixed.includeSpouse")}</span>
									</label>
								</div>
								<Input
									type="number"
									id="spouse-income"
									value={fixedIncome.spouse}
									onChange={(event) => handleFixedIncomeChange("spouse", event.target.value)}
									onBlur={handleFixedIncomeBlur}
									disabled={!fixedIncome.includeSpouse}
								/>
							</div>
							<div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
								<p className="text-muted-foreground">{t("fixed.summary")}</p>
								<p className="text-xl font-semibold">
									{formatCurrency(fixedTotals.total, baseCurrency, locale)}
								</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<CardTitle>{t("form.title")}</CardTitle>
								<CardDescription>{t("form.description")}</CardDescription>
							</div>
							<Button variant="outline" size="sm" onClick={resetForm} className="gap-2">
								<RefreshCw className="h-3.5 w-3.5" />
								{t("form.reset")}
							</Button>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleAddIncome} className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="description">{t("form.descriptionLabel")}</Label>
									<Input
										id="description"
										value={formState.description}
										onChange={(event) => handleFormChange("description", event.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="amount">{t("form.amountLabel")}</Label>
									<Input
										type="number"
										id="amount"
										min={0}
										step="0.01"
										value={formState.amount}
										onChange={(event) => handleFormChange("amount", event.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="currency">{t("form.currencyLabel")}</Label>
									<select
										id="currency"
										value={formState.currency}
										onChange={(event) => handleFormChange("currency", event.target.value)}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
									>
										<option value="ILS">{t("settings.baseCurrencyOptions.ils")}</option>
										<option value="USD">{t("settings.baseCurrencyOptions.usd")}</option>
									</select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="source">{t("form.sourceLabel")}</Label>
									<select
										id="source"
										value={formState.source}
										onChange={(event) => handleFormChange("source", event.target.value)}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
									>
										{sourceOptions.map((option) => (
											<option key={option} value={option}>
												{t(`sources.${option}`)}
											</option>
										))}
									</select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="date">{t("form.dateLabel")}</Label>
									<Input
										type="date"
										id="date"
										value={formState.date}
										onChange={(event) => handleFormChange("date", event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="schedule">{t("form.scheduleLabel")}</Label>
									<select
										id="schedule"
										value={formState.schedule}
										onChange={(event) => handleFormChange("schedule", event.target.value)}
										className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
									>
										{scheduleOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{t(`form.scheduleOptions.${option.value}`)}
											</option>
										))}
									</select>
								</div>
								{formState.schedule === "multiMonth" && (
									<div className="space-y-2">
										<Label htmlFor="total-months">{t("form.totalMonthsLabel")}</Label>
										<Input
											type="number"
											id="total-months"
											min={2}
											value={formState.totalMonths}
											onChange={(event) => handleFormChange("totalMonths", event.target.value)}
											required
										/>
									</div>
								)}
								<div className="space-y-2 md:col-span-2">
									<Label htmlFor="note">{t("form.noteLabel")}</Label>
									<textarea
										id="note"
										value={formState.note}
										onChange={(event) => handleFormChange("note", event.target.value)}
										className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
									/>
								</div>
								<div className="md:col-span-2 flex items-center justify-end gap-2">
									<Button type="submit" className="gap-2" disabled={isSubmitting}>
										<PlusCircle className="h-4 w-4" />
										{isSubmitting ? tCommon("loading") : t("form.submit")}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{t("table.title")}</CardTitle>
							<CardDescription>{t("table.description")}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Desktop/tablet table */}
							<div className="hidden md:block overflow-x-auto rounded-lg border border-border/60">
								<table className="min-w-full divide-y divide-border/60 text-sm">
									<thead className="bg-muted/50">
										<tr>
											<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.description")}</th>
											<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.amount")}</th>
											<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.source")}</th>
											<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.date")}</th>
											<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.schedule")}</th>
											<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.baseAmount")}</th>
											<th className="px-4 py-3 text-left font-medium text-muted-foreground" />
										</tr>
									</thead>
									<tbody className="divide-y divide-border/40">
										{variableIncomes.length === 0 ? (
											<tr>
												<td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
													{t("table.empty")}
												</td>
											</tr>
										) : (
											variableIncomes.map((income) => {
												const converted = convertCurrency(income.amount, income.currency, baseCurrency);
												return (
													<tr key={income.id}>
														<td className="px-4 py-3">
															<div className="font-medium">{income.description}</div>
															{income.note ? <p className="text-xs text-muted-foreground">{income.note}</p> : null}
														</td>
														<td className="px-4 py-3">
															{formatCurrency(income.amount, income.currency, locale)}
															{income.currency !== baseCurrency ? (
																<div className="text-xs text-amber-600">{t("table.convertedFlag")}</div>
															) : null}
														</td>
														<td className="px-4 py-3 capitalize">{t(`sources.${income.source}`)}</td>
														<td className="px-4 py-3">{new Date(income.date).toLocaleDateString(locale === "he" ? "he-IL" : "en-US")}</td>
														<td className="px-4 py-3">
															{t(`form.scheduleOptions.${income.schedule}`)}
															{income.schedule === "multiMonth" && income.totalMonths ? (
																<div className="text-xs text-muted-foreground">{t("table.monthCount", { count: income.totalMonths })}</div>
															) : null}
														</td>
														<td className="px-4 py-3 font-medium">
															{formatCurrency(converted, baseCurrency, locale)}
														</td>
														<td className="px-4 py-3 text-right">
															<Button
																variant="ghost"
																size="sm"
																className="text-destructive"
																onClick={() => handleRemoveIncome(income.id)}
																disabled={isSaving}
															>
																<MinusCircle className="h-4 w-4" />
																<span className="sr-only">{tCommon("delete")}</span>
															</Button>
														</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>

							{/* Mobile card list */}
							<div className="md:hidden space-y-3">
								{variableIncomes.length === 0 ? (
									<div className="rounded-lg border border-border/60 p-4 text-center text-sm text-muted-foreground">
										{t("table.empty")}
									</div>
								) : (
									variableIncomes.map((income) => {
										const converted = convertCurrency(income.amount, income.currency, baseCurrency);
										return (
											<div key={income.id} className="rounded-lg border border-border/60 bg-background p-4">
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="font-semibold">{income.description}</p>
														{income.note ? <p className="mt-1 text-xs text-muted-foreground">{income.note}</p> : null}
													</div>
													<div className="text-right">
														<p className="text-sm font-medium">{formatCurrency(income.amount, income.currency, locale)}</p>
														<p className="text-xs text-muted-foreground">{formatCurrency(converted, baseCurrency, locale)}</p>
														{income.currency !== baseCurrency ? (
															<p className="text-[10px] text-amber-600">{t("table.convertedFlag")}</p>
														) : null}
													</div>
												</div>
												<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
													<span className="capitalize text-xs text-muted-foreground">{t(`sources.${income.source}`)}</span>
													<span className="text-xs">{t(`form.scheduleOptions.${income.schedule}`)}</span>
													<div className="flex-1" />
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive"
														onClick={() => handleRemoveIncome(income.id)}
														disabled={isSaving}
													>
														<MinusCircle className="h-4 w-4" />
														<span className="sr-only">{tCommon("delete")}</span>
													</Button>
												</div>
											</div>
										);
									})
								)}
							</div>

							<div className="grid gap-4 lg:grid-cols-3">
								<div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
									<p className="text-muted-foreground">{t("summary.monthlyIncome")}</p>
									<p className="text-xl font-semibold">
										{formatCurrency(fixedTotals.total + variableTotals.total, baseCurrency, locale)}
									</p>
								</div>
								<div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
									<p className="text-muted-foreground">{t("summary.estimatedMaaser")}</p>
									<p className="text-xl font-semibold">
										{formatCurrency(monthlyObligation, baseCurrency, locale)}
									</p>
								</div>
								<div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
									<p className="text-muted-foreground">{t("summary.conversionTotal")}</p>
									<p className="text-xl font-semibold">
										{convertedCount > 0
												? formatCurrency(variableTotals.converted, baseCurrency, locale)
												: t("summary.noConversions")}
									</p>
								</div>
							</div>
							<p className="text-xs text-muted-foreground">{t("summary.helper")}</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

export default IncomeManager;
