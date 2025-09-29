"use client";

import { CheckCircle2, HandCoins, PauseCircle, PlusCircle, Recycle, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertCurrency, formatCurrency } from "@/lib/finance";
import type { CurrencyCode, DonationEntry, DonationType } from "@/types/finance";

const donationTypes: DonationType[] = ["oneTime", "recurring", "installments"];
const INSTALLMENT_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index + 1));

interface DonationFormState {
	organization: string;
	amount: string;
	currency: CurrencyCode;
	type: DonationType;
	startDate: string;
	installmentsRemaining: string;
	installmentsPaid: string;
	note: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const computeDonationProgress = (donation: DonationEntry): number => {
	if (donation.type === "installments" && donation.installmentsTotal) {
		const paid = donation.installmentsPaid ?? 0;
		const ratio = paid / donation.installmentsTotal;
		return Math.max(0, Math.min(100, Math.round(ratio * 100)));
	}
	if (donation.type === "recurring") {
		return 100;
	}
	return donation.isActive ? 0 : 100;
};

export function DonationsManager() {
	const locale = useLocale();
	const t = useTranslations("donations");
	const tCommon = useTranslations("common");

	const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("ILS");
	const [donations, setDonations] = useState<DonationEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [formState, setFormState] = useState<DonationFormState>({
		organization: "",
		amount: "",
		currency: "ILS",
		type: "recurring",
		startDate: todayISO(),
		installmentsRemaining: "6",
		installmentsPaid: "0",
		note: "",
	});

	const loadData = useCallback(async () => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/financial/donations", {
				method: "GET",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error((await response.json())?.error || "Failed to load donations");
			}

			const data = await response.json();
			const settings = data.settings ?? {};
			const nextCurrency = (settings.currency as CurrencyCode) ?? "ILS";
			setBaseCurrency(nextCurrency);
			setDonations(Array.isArray(data.donations) ? data.donations : []);
			setFetchError(null);
		} catch (error) {
			console.error("Failed to load donations", error);
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
				console.error("Failed to update donation settings", error);
				toast.error(error instanceof Error ? error.message : tCommon("error"));
			} finally {
				setIsSaving(false);
			}
		},
		[tCommon],
	);

	const handleBaseCurrencyChange = useCallback(
		(next: CurrencyCode) => {
			setBaseCurrency(next);
			persistSettings({ currency: next });
		},
		[persistSettings],
	);

	const totals = useMemo(() => {
		return donations.reduce(
			(acc, donation) => {
				const converted = convertCurrency(donation.amount, donation.currency, baseCurrency);
				acc.total += converted;
				if (donation.isActive) {
					acc.active += converted;
				}
				if (donation.currency !== baseCurrency) {
					acc.converted += converted;
				}
				if (donation.type === "installments" && donation.installmentsTotal && donation.installmentsPaid) {
					const progress = donation.installmentsPaid / donation.installmentsTotal;
					acc.installmentProgress += progress;
					acc.installmentCount += 1;
				}
				return acc;
			},
			{ total: 0, active: 0, converted: 0, installmentProgress: 0, installmentCount: 0 },
		);
	}, [baseCurrency, donations]);

	const averageInstallmentProgress = totals.installmentCount === 0 ? 0 : Math.round((totals.installmentProgress / totals.installmentCount) * 100);
	const convertedDonations = donations.filter((donation) => donation.currency !== baseCurrency);

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

	const handleFormChange = (field: keyof DonationFormState, value: string) => {
		setFormState((prev) => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setFormState({
			organization: "",
			amount: "",
			currency: baseCurrency,
			type: "recurring",
			startDate: todayISO(),
			installmentsRemaining: "6",
			installmentsPaid: "0",
			note: "",
		});
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const amountNumber = Number(formState.amount);

		if (!formState.organization.trim()) {
			toast.error(t("form.errors.organizationRequired"));
			return;
		}
		if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
			toast.error(t("form.errors.amountPositive"));
			return;
		}
		if (formState.type === "installments") {
			const remaining = Number(formState.installmentsRemaining);
			const paid = Number(formState.installmentsPaid || 0);
			if (!Number.isFinite(remaining) || remaining < 1) {
				toast.error(t("form.errors.installmentsRequired"));
				return;
			}
			if (!Number.isFinite(paid) || paid < 0) {
				toast.error(t("form.errors.installmentsPaidNonNegative"));
				return;
			}
			if (remaining + paid < 1) {
				toast.error(t("form.errors.installmentsRequired"));
				return;
			}
		}

		const paidCount = formState.type === "installments" ? Math.max(0, Number(formState.installmentsPaid || 0)) : null;
		const remainingCount = formState.type === "installments" ? Math.max(0, Number(formState.installmentsRemaining || 0)) : null;
		const totalInstallments = formState.type === "installments" && remainingCount !== null && paidCount !== null
			? remainingCount + paidCount
			: null;

		const payload = {
			organization: formState.organization.trim(),
			amount: amountNumber,
			currency: formState.currency,
			type: formState.type,
			startDate: formState.startDate,
			installmentsTotal: totalInstallments,
			installmentsPaid: paidCount,
			note: formState.note?.trim() || null,
		};

		try {
			setIsSubmitting(true);
			const response = await fetch("/api/financial/donations", {
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
			if (data?.donation) {
				setDonations((prev) => [data.donation as DonationEntry, ...prev]);
			}
			toast.success(t("form.success"));
			resetForm();
		} catch (error) {
			console.error("Failed to create donation", error);
			toast.error(error instanceof Error ? error.message : tCommon("error"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRemove = async (id: string) => {
		try {
			setIsSaving(true);
			const response = await fetch(`/api/financial/donations/${id}`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error((await response.json())?.error || tCommon("error"));
			}

			setDonations((prev) => prev.filter((donation) => donation.id !== id));
			toast.success(t("table.removed"));
		} catch (error) {
			console.error("Failed to remove donation", error);
			toast.error(error instanceof Error ? error.message : tCommon("error"));
		} finally {
			setIsSaving(false);
		}
	};

	const toggleActive = (id: string) => {
		setDonations((prev) =>
			prev.map((donation) =>
				donation.id === id
					? {
						...donation,
						isActive: !donation.isActive,
					}
					: donation,
				),
		);
	};

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold tracking-tight">{t("headline")}</h1>
				<p className="max-w-3xl text-muted-foreground">{t("subheadline")}</p>
			</div>

			<Card className="border-primary/40 bg-primary/5">
				<CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<CardTitle>{t("summary.title")}</CardTitle>
						<CardDescription>{t("summary.description")}</CardDescription>
						{isSaving && <p className="text-xs font-medium text-primary">{tCommon("saving")}</p>}
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<label className="flex items-center gap-2 text-sm font-medium">
							<span>{t("summary.baseCurrencyLabel")}</span>
							<select
								value={baseCurrency}
								onChange={(event) => handleBaseCurrencyChange(event.target.value as CurrencyCode)}
								className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							>
								<option value="ILS">{t("summary.baseCurrencyOptions.ils")}</option>
								<option value="USD">{t("summary.baseCurrencyOptions.usd")}</option>
							</select>
						</label>
						<div className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
							{t("summary.conversionHint", { rate: convertCurrency(1, "USD", "ILS").toFixed(2) })}
						</div>
					</div>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-border/60 bg-background p-4 text-sm">
						<p className="text-muted-foreground">{t("summary.total")}</p>
						<p className="text-2xl font-semibold">{formatCurrency(totals.total, baseCurrency, locale)}</p>
					</div>
					<div className="rounded-lg border border-border/60 bg-background p-4 text-sm">
						<p className="text-muted-foreground">{t("summary.active")}</p>
						<p className="text-2xl font-semibold">{formatCurrency(totals.active, baseCurrency, locale)}</p>
					</div>
					<div className="rounded-lg border border-border/60 bg-background p-4 text-sm">
						<p className="text-muted-foreground">{t("summary.averageProgress")}</p>
						<p className="text-2xl font-semibold">{averageInstallmentProgress}%</p>
					</div>
					<div className="rounded-lg border border-border/60 bg-background p-4 text-sm">
						<p className="text-muted-foreground">{t("summary.converted")}</p>
						<p className="text-2xl font-semibold">
							{convertedDonations.length > 0
								? formatCurrency(totals.converted, baseCurrency, locale)
								: t("summary.none")}
						</p>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
				<Card>
					<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle>{t("form.title")}</CardTitle>
							<CardDescription>{t("form.description")}</CardDescription>
						</div>
						<Button variant="outline" size="sm" onClick={resetForm} className="gap-2">
							<Recycle className="h-3.5 w-3.5" />
							{t("form.reset")}
						</Button>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="organization">{t("form.organizationLabel")}</Label>
								<Input
									id="organization"
									value={formState.organization}
									onChange={(event) => handleFormChange("organization", event.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="donation-amount">{t("form.amountLabel")}</Label>
								<Input
									type="number"
									id="donation-amount"
									min={0}
									step="0.01"
									value={formState.amount}
									onChange={(event) => handleFormChange("amount", event.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="donation-currency">{t("form.currencyLabel")}</Label>
								<select
									id="donation-currency"
									value={formState.currency}
									onChange={(event) => handleFormChange("currency", event.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
								>
									<option value="ILS">{t("summary.baseCurrencyOptions.ils")}</option>
									<option value="USD">{t("summary.baseCurrencyOptions.usd")}</option>
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="donation-type">{t("form.typeLabel")}</Label>
								<select
									id="donation-type"
									value={formState.type}
									onChange={(event) => handleFormChange("type", event.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
								>
									{donationTypes.map((type) => (
										<option key={type} value={type}>
											{t(`form.typeOptions.${type}`)}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="donation-date">{t("form.dateLabel")}</Label>
								<Input
									type="date"
									id="donation-date"
									value={formState.startDate}
									onChange={(event) => handleFormChange("startDate", event.target.value)}
								/>
							</div>
							{formState.type === "installments" && (
								<>
									<div className="space-y-2">
										<Label htmlFor="installments-remaining">{t("form.installmentsRemainingLabel")}</Label>
										<select
											id="installments-remaining"
											value={formState.installmentsRemaining}
											onChange={(event) => handleFormChange("installmentsRemaining", event.target.value)}
											className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
											required
										>
											{INSTALLMENT_OPTIONS.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</div>
									<div className="space-y-2">
										<Label htmlFor="installments-paid">{t("form.installmentsPaidLabel")}</Label>
										<Input
											type="number"
											id="installments-paid"
											min={0}
											value={formState.installmentsPaid}
											onChange={(event) => handleFormChange("installmentsPaid", event.target.value)}
										/>
									</div>
								</>
							)}
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="donation-note">{t("form.noteLabel")}</Label>
								<textarea
									id="donation-note"
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

				<Card className="h-fit">
					<CardHeader>
						<CardTitle>{t("alerts.title")}</CardTitle>
						<CardDescription>{t("alerts.description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-sm">
						<div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
							<CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
							<div>
								<p className="font-medium text-emerald-700">{t("alerts.progress.title")}</p>
								<p className="text-emerald-700/80">{t("alerts.progress.description", { progress: averageInstallmentProgress })}</p>
							</div>
						</div>
						<div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
							<HandCoins className="mt-0.5 h-4 w-4 text-amber-600" />
							<div>
								<p className="font-medium text-amber-700">{t("alerts.conversions.title")}</p>
								<p className="text-amber-700/80">
									{convertedDonations.length > 0
										? t("alerts.conversions.description", {
											count: convertedDonations.length,
											sum: formatCurrency(totals.converted, baseCurrency, locale),
										})
										: t("alerts.conversions.none")}
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
							<PauseCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
							<div>
								<p className="font-medium text-foreground">{t("alerts.pauseReminder.title")}</p>
								<p className="text-muted-foreground">{t("alerts.pauseReminder.description")}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("table.title")}</CardTitle>
					<CardDescription>{t("table.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="overflow-x-auto rounded-lg border border-border/60">
						<table className="min-w-full divide-y divide-border/60 text-sm">
							<thead className="bg-muted/50">
								<tr>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.organization")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.type")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.amount")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.status")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("table.columns.progress")}</th>
									<th className="px-4 py-3 text-left font-medium text-muted-foreground" />
								</tr>
							</thead>
							<tbody className="divide-y divide-border/40">
								{donations.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
											{t("table.empty")}
										</td>
									</tr>
								) : (
									donations.map((donation) => {
										const convertedAmount = convertCurrency(donation.amount, donation.currency, baseCurrency);
										const progressPercentage = computeDonationProgress(donation);
										return (
											<tr key={donation.id}>
												<td className="px-4 py-3">
													<div className="font-medium">{donation.organization}</div>
													{donation.note ? <p className="text-xs text-muted-foreground">{donation.note}</p> : null}
												</td>
												<td className="px-4 py-3">
													<span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs font-medium">
														{t(`form.typeOptions.${donation.type}`)}
													</span>
													{donation.type === "installments" && donation.installmentsTotal ? (
														<div className="text-xs text-muted-foreground">
															{t("table.installmentInfo", {
																current: donation.installmentsPaid ?? 0,
																total: donation.installmentsTotal,
															})}
														</div>
													) : null}
												</td>
												<td className="px-4 py-3">
													<div className="font-medium">{formatCurrency(donation.amount, donation.currency, locale)}</div>
													<div className="text-xs text-muted-foreground">
														{t("table.baseAmount", { amount: formatCurrency(convertedAmount, baseCurrency, locale) })}
													</div>
													{donation.currency !== baseCurrency ? (
														<div className="text-xs text-amber-600">{t("table.convertedFlag")}</div>
													) : null}
												</td>
												<td className="px-4 py-3">
													<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
														donation.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
													}`}> 
														{donation.isActive ? t("table.status.active") : t("table.status.inactive")}
													</span>
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center gap-2">
														<div className="h-2 w-24 rounded-full bg-muted">
															<div
																className="h-2 rounded-full bg-primary"
																style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
															/>
														</div>
														<span className="text-xs font-medium">{progressPercentage}%</span>
													</div>
												</td>
												<td className="px-4 py-3 text-right">
													<div className="flex justify-end gap-2">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => toggleActive(donation.id)}
															className="text-emerald-600"
														>
															{donation.isActive ? <PauseCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
															<span className="sr-only">{donation.isActive ? t("table.actions.pause") : t("table.actions.resume")}</span>
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleRemove(donation.id)}
															className="text-destructive"
															disabled={isSaving}
														>
															<Trash2 className="h-4 w-4" />
															<span className="sr-only">{tCommon("delete")}</span>
														</Button>
													</div>
												</td>
										</tr>
									);
								})
								)}
							</tbody>
						</table>
					</div>
					<div className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
						{t("table.helper")}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default DonationsManager;
