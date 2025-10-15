"use client";

import { AlertTriangle, Globe2, HandCoins, Save, ShieldCheck, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertCurrency, formatCurrency } from "@/lib/finance";
import type { CurrencyCode } from "@/types/finance";

const CLOSE_OPTIONS: Array<"carry" | "reset"> = ["carry", "reset"];

export function SettingsManager() {
	const locale = useLocale();
	const t = useTranslations("settings");
	const tCommon = useTranslations("common");

	const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("ILS");
	const [tithePercent, setTithePercent] = useState(10);
	const [language, setLanguage] = useState(locale.startsWith("he") ? "he" : "en");
	const [closingStrategy, setClosingStrategy] = useState<"carry" | "reset">("carry");
	const [carryDebtForward, setCarryDebtForward] = useState(true);
	const [showConversionWarnings, setShowConversionWarnings] = useState(true);
	const [enableMonthlySummary, setEnableMonthlySummary] = useState(true);
	const [enableEndOfYearPrompt, setEnableEndOfYearPrompt] = useState(true);
	const [enableConversionAlerts, setEnableConversionAlerts] = useState(true);

	const handleSave = () => {
		toast.success(t("form.success"));
	};

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold tracking-tight">{t("headline")}</h1>
				<p className="max-w-3xl text-muted-foreground">{t("subheadline")}</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-[360px_1fr]">
				<Card className="h-fit border-primary/40 bg-primary/5">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<HandCoins className="h-4 w-4 text-primary" />
							{t("profileSummary.title")}
						</CardTitle>
						<CardDescription>{t("profileSummary.description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-sm">
						<div className="rounded-lg border border-border/60 bg-background p-4">
							<p className="text-muted-foreground">{t("profileSummary.currencyLabel")}</p>
							<p className="text-xl font-semibold">{t(`profileSummary.currencyOptions.${baseCurrency}`)}</p>
						</div>
						<div className="rounded-lg border border-border/60 bg-background p-4">
							<p className="text-muted-foreground">{t("profileSummary.titheLabel")}</p>
							<p className="text-xl font-semibold">{tithePercent}%</p>
						</div>
						<div className="rounded-lg border border-border/60 bg-background p-4">
							<p className="text-muted-foreground">{t("profileSummary.sampleAmount")}</p>
							<p className="text-xl font-semibold">
								{formatCurrency(convertCurrency(1000, baseCurrency, baseCurrency), baseCurrency, locale)}
							</p>
						</div>
						<div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
							{t("profileSummary.helper", { rate: convertCurrency(1, "USD", "ILS").toFixed(2) })}
						</div>
					</CardContent>
				</Card>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<TrendingUp className="h-4 w-4 text-primary" />
								{t("financial.title")}
							</CardTitle>
							<CardDescription>{t("financial.description")}</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="currency-select">{t("financial.baseCurrencyLabel")}</Label>
								<select
									id="currency-select"
									value={baseCurrency}
									onChange={(event) => setBaseCurrency(event.target.value as CurrencyCode)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
								>
									<option value="ILS">{t("financial.currencyOptions.ils")}</option>
									<option value="USD">{t("financial.currencyOptions.usd")}</option>
								</select>
								<p className="text-xs text-muted-foreground">{t("financial.currencyHelper")}</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="tithe-percent">{t("financial.titheLabel")}</Label>
								<Input
									type="number"
									id="tithe-percent"
									min={1}
									max={25}
									value={tithePercent}
									onChange={(event) => setTithePercent(Number(event.target.value) || 0)}
								/>
								<p className="text-xs text-muted-foreground">{t("financial.titheHelper")}</p>
							</div>
							<div className="space-y-2 md:col-span-2">
								<p className="text-sm font-medium text-foreground">{t("financial.closingLabel")}</p>
								<div className="grid gap-2 sm:grid-cols-2">
									{CLOSE_OPTIONS.map((option) => {
										const optionId = `closing-option-${option}`;
										return (
											<label
												htmlFor={optionId}
												aria-label={t(`financial.closingOptions.${option}.title`)}
												key={option}
												className={`flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm ${
													closingStrategy === option ? "border-primary bg-primary/10" : ""
												}`}
											>
												<input
													id={optionId}
													type="radio"
													name="closing-option"
													value={option}
													checked={closingStrategy === option}
													onChange={() => setClosingStrategy(option)}
													className="h-3.5 w-3.5 text-primary focus:ring-primary"
												/>
												<div>
													<p className="font-medium">{t(`financial.closingOptions.${option}.title`)}</p>
													<p className="text-xs text-muted-foreground">{t(`financial.closingOptions.${option}.description`)}</p>
												</div>
											</label>
										);
									})}
								</div>
							</div>
							<div className="space-y-2 md:col-span-2">
								{(() => {
									const checkboxId = "carry-debt-forward";
									return (
										<label
											htmlFor={checkboxId}
											aria-label={t("financial.carryDebtForward")}
											className="flex items-center gap-2 text-sm"
										>
											<input
												id={checkboxId}
												type="checkbox"
												checked={carryDebtForward}
												onChange={(event) => setCarryDebtForward(event.target.checked)}
												className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
											/>
											<span>{t("financial.carryDebtForward")}</span>
										</label>
									);
								})()}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Globe2 className="h-4 w-4 text-primary" />
								{t("language.title")}
							</CardTitle>
							<CardDescription>{t("language.description")}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="language-select">{t("language.label")}</Label>
								<select
									id="language-select"
									value={language}
									onChange={(event) => setLanguage(event.target.value)}
									className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
								>
									<option value="he">{t("language.options.he")}</option>
									<option value="en">{t("language.options.en")}</option>
								</select>
								<p className="text-xs text-muted-foreground">{t("language.helper")}</p>
							</div>
							<div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
								{t("language.notice")}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<ShieldCheck className="h-4 w-4 text-primary" />
								{t("notifications.title")}
							</CardTitle>
							<CardDescription>{t("notifications.description")}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							{(() => {
								const checkboxId = "monthly-summary-toggle";
								return (
									<label
										htmlFor={checkboxId}
										aria-label={t("notifications.monthlySummary.title")}
										className="flex items-center gap-3"
									>
										<input
											id={checkboxId}
											type="checkbox"
											checked={enableMonthlySummary}
											onChange={(event) => setEnableMonthlySummary(event.target.checked)}
											className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
										/>
										<span>
											<strong className="block">{t("notifications.monthlySummary.title")}</strong>
											<span className="text-muted-foreground">{t("notifications.monthlySummary.description")}</span>
										</span>
									</label>
								);
							})()}
							{(() => {
								const checkboxId = "conversion-alerts-toggle";
								return (
									<label
										htmlFor={checkboxId}
										aria-label={t("notifications.conversionAlerts.title")}
										className="flex items-center gap-3"
									>
										<input
											id={checkboxId}
											type="checkbox"
											checked={enableConversionAlerts}
											onChange={(event) => setEnableConversionAlerts(event.target.checked)}
											className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
										/>
										<span>
											<strong className="block">{t("notifications.conversionAlerts.title")}</strong>
											<span className="text-muted-foreground">{t("notifications.conversionAlerts.description")}</span>
										</span>
									</label>
								);
							})()}
							{(() => {
								const checkboxId = "end-of-year-toggle";
								return (
									<label
										htmlFor={checkboxId}
										aria-label={t("notifications.endOfYear.title")}
										className="flex items-center gap-3"
									>
										<input
											id={checkboxId}
											type="checkbox"
											checked={enableEndOfYearPrompt}
											onChange={(event) => setEnableEndOfYearPrompt(event.target.checked)}
											className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
										/>
										<span>
											<strong className="block">{t("notifications.endOfYear.title")}</strong>
											<span className="text-muted-foreground">{t("notifications.endOfYear.description")}</span>
										</span>
									</label>
								);
							})()}
						</CardContent>
					</Card>

					<Card className="border-amber-500/40 bg-amber-500/10">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-amber-700">
								<AlertTriangle className="h-4 w-4" />
								{t("conversionNotice.title")}
							</CardTitle>
							<CardDescription>{t("conversionNotice.description")}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-amber-700">
							{(() => {
								const checkboxId = "conversion-warnings-toggle";
								return (
									<label
										htmlFor={checkboxId}
										aria-label={t("conversionNotice.warnings")}
										className="flex items-center gap-2"
									>
										<input
											id={checkboxId}
											type="checkbox"
											checked={showConversionWarnings}
											onChange={(event) => setShowConversionWarnings(event.target.checked)}
											className="h-4 w-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500"
										/>
										<span>{t("conversionNotice.warnings")}</span>
									</label>
								);
							})()}
							<p>{t("conversionNotice.helper")}</p>
						</CardContent>
					</Card>

					<div className="flex justify-end">
						<Button onClick={handleSave} className="gap-2">
							<Save className="h-4 w-4" />
							{tCommon("save")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default SettingsManager;
