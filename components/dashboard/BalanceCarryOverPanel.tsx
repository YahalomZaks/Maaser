"use client";

import { AlertCircle, CheckCircle, Info } from "lucide-react";
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
	onCarryDecision?: (shouldCarry: boolean) => void;
	className?: string;
}

export function BalanceCarryOverPanel({
	balance,
	currency,
	monthCarryStrategy,
	isDecember = false,
	isYearComplete = false,
	onCarryDecision,
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

	// ASK_ME: Prompt user for decision (only for surplus, debt always carries)
	if (monthCarryStrategy === "ASK_ME") {
		if (isSurplus) {
			return (
				<Card className={cn("border-primary/30 bg-primary/5", className)}>
					<CardContent className="p-4">
						<div className="space-y-3">
							<div className="flex items-start gap-3">
								<Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
								<div className="flex-1">
									<h3 className="font-semibold">{t("askMe.title")}</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										{t("askMe.message", { amount: formattedBalance })}
									</p>
								</div>
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="default" onClick={() => onCarryDecision?.(true)}>
									{t("askMe.yes")}
								</Button>
								<Button size="sm" variant="outline" onClick={() => onCarryDecision?.(false)}>
									{t("askMe.no")}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			);
		} else {
			// Debt always carries
			return (
				<Card className={cn("border-l-4 border-l-orange-500 bg-orange-50/50", className)}>
					<CardContent className="p-4">
						<div className="flex items-start gap-3">
							<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
							<p className="text-sm">{t("askMe.debt", { amount: formattedBalance })}</p>
						</div>
					</CardContent>
				</Card>
			);
		}
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
