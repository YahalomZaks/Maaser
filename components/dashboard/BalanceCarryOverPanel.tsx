"use client";

import { CheckCircle, Info } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types/finance";

type MonthCarryStrategy = "CARRY_FORWARD" | "INDEPENDENT" | "ASK_ME";

interface BalanceCarryOverPanelProps {
	balance: number;
	currency: CurrencyCode;
	monthCarryStrategy: MonthCarryStrategy;
	isDecember?: boolean;
	isYearComplete?: boolean;
	className?: string;
}

export function BalanceCarryOverPanel({
	balance,
	currency,
	monthCarryStrategy,
	isDecember = false,
	isYearComplete = false,
	className,
}: BalanceCarryOverPanelProps) {
	const locale = useLocale();
	const t = useTranslations("dashboard.carryOver");
	const localePrefix = `/${locale}`;

	// Don't show anything if balance is zero
	if (balance === 0) {
		return null;
	}

	const isSurplus = balance > 0;
	const absBalance = Math.abs(balance);
	const formattedBalance = formatCurrency(absBalance, currency, locale);

	// Year-end special case (December with completed obligation)
	if (isDecember && isYearComplete && isSurplus) {
			return (
			<Card className={cn("border-primary/30 bg-primary/5", className)}>
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						<CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
						<div className="flex-1 space-y-2">
							<h3 className="font-semibold text-primary">{t("yearEnd.title")}</h3>
							<p className="text-sm text-muted-foreground">
								{t("yearEnd.message", { amount: formattedBalance })}
							</p>
							<Button asChild size="sm" variant="default">
								<Link href={`${localePrefix}/dashboard/settings`}>{t("yearEnd.updateSettings")}</Link>
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	// CARRY_FORWARD: Automatic carry
	if (monthCarryStrategy === "CARRY_FORWARD") {
		return (
			<Card
				className={cn(
					"border-l-4",
					isSurplus ? "border-l-emerald-500 bg-emerald-50/50" : "border-l-orange-500 bg-orange-50/50",
					className,
				)}
			>
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						<Info className="mt-0.5 h-5 w-5 shrink-0" />
						<p className="text-sm">
							{isSurplus
								? t("automaticCarry.surplus", { amount: formattedBalance })
								: t("automaticCarry.debt", { amount: formattedBalance })}
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}
		// Coerce deprecated ASK_ME behavior to CARRY_FORWARD for now
		if (monthCarryStrategy === "ASK_ME") {
			return (
				<Card
					className={cn(
						"border-l-4",
						isSurplus ? "border-l-emerald-500 bg-emerald-50/50" : "border-l-orange-500 bg-orange-50/50",
						className,
					)}
				>
					<CardContent className="p-4">
						<div className="flex items-start gap-3">
							<Info className="mt-0.5 h-5 w-5 shrink-0" />
							<p className="text-sm">
								{isSurplus
									? t("automaticCarry.surplus", { amount: formattedBalance })
									: t("automaticCarry.debt", { amount: formattedBalance })}
							</p>
						</div>
					</CardContent>
				</Card>
			);
		}

	// INDEPENDENT: Each month on its own (show surplus info with settings link)
	if (monthCarryStrategy === "INDEPENDENT" && isSurplus) {
		return (
			<Card className={cn("border-emerald-500/30 bg-emerald-50/50", className)}>
				<CardContent className="p-4">
					<div className="space-y-2">
						<div className="flex items-start gap-3">
							<Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
							<p className="text-sm">{t("independent.surplus", { amount: formattedBalance })}</p>
						</div>
						<Button asChild size="sm" variant="outline">
							<Link href={`${localePrefix}/dashboard/settings`}>{t("independent.goToSettings")}</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	// For INDEPENDENT with debt, show nothing (each month standalone)
	return null;
}
