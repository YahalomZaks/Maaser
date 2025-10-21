"use client";

import { Coins } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/finance";
import type { CurrencyCode } from "@/types/finance";

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

interface IncomeEntry { id: string; description: string; amount: number; }

interface MonthIncomeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	monthIndex: number; // 0-11
	year: number;
	isLoading?: boolean;
	incomeEntries?: IncomeEntry[];
	totalIncome?: number;
	currency: CurrencyCode;
}

export function MonthIncomeModal({
	open,
	onOpenChange,
	monthIndex,
	year,
	incomeEntries = [],
	isLoading = false,
	totalIncome = 0,
	currency,
}: MonthIncomeModalProps) {
	const locale = useLocale();
	const t = useTranslations("dashboard.monthDetails");
	const tMonths = useTranslations("months");
	const dir = locale.startsWith("he") ? "rtl" : "ltr";

	const monthName = tMonths(MONTH_KEYS[monthIndex]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-2xl w-[min(620px,96vw)] max-h-[85vh] min-h-[420px] overflow-y-auto"
				dir={dir}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Coins className="h-5 w-5" />
						{t("tabs.income")} - {monthName} {year}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 min-h-[260px] sm:min-h-[300px]">
					{(() => {
						if (isLoading) {
							return (
								<div className="rounded-xl border divide-y animate-pulse">
									{Array.from({ length: 4 }).map((_, i) => (
										<div key={i} className="flex items-center justify-between px-4 py-3">
											<div className="h-4 w-40 bg-muted rounded" />
											<div className="h-4 w-24 bg-muted rounded" />
										</div>
									))}
								</div>
							);
						}
						if (incomeEntries.length > 0) {
							return (
								<div className="rounded-xl border divide-y">
									{incomeEntries.map((entry) => (
										<div key={entry.id} className="flex items-center justify-between px-4 py-3">
											<span className="font-medium">{entry.description}</span>
											<span className="font-semibold">{formatCurrency(entry.amount, currency, locale)}</span>
										</div>
									))}
								</div>
							);
						}
						return (
							<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
								{t("incomeBreakdown.noIncome")}
							</div>
						);
					})()}
					{isLoading ? (
						<div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 font-semibold animate-pulse">
							<div className="h-4 w-24 bg-muted rounded" />
							<div className="h-4 w-24 bg-muted rounded" />
						</div>
					) : (
						<div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 font-semibold">
							<span>{t("incomeBreakdown.total")}</span>
							<span>{formatCurrency(totalIncome, currency, locale)}</span>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
