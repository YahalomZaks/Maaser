"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

interface MonthSelectorProps {
	selectedYear: number;
	selectedMonth: number; // 0-11
	onMonthChange: (month: number, year: number) => void;
	earliestDate?: Date; // Registration date - can't select before this
	className?: string;
}

export function MonthSelector({
	selectedYear,
	selectedMonth,
	onMonthChange,
	earliestDate,
	className,
}: MonthSelectorProps) {
	const locale = useLocale();
	const t = useTranslations("dashboard.monthSelector");
	const tMonths = useTranslations("months");
	const dir = locale.startsWith("he") ? "rtl" : "ltr";

	const canGoPrevious = useMemo(() => {
		if (!earliestDate) {
			return true;
		}

		const earliestYear = earliestDate.getFullYear();
		const earliestMonth = earliestDate.getMonth();

		if (selectedYear > earliestYear) {
			return true;
		}
		if (selectedYear === earliestYear && selectedMonth > earliestMonth) {
			return true;
		}

		return false;
	}, [selectedYear, selectedMonth, earliestDate]);

	const canGoNext = useMemo(() => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();

		if (selectedYear < currentYear) {
			return true;
		}
		if (selectedYear === currentYear && selectedMonth < currentMonth) {
			return true;
		}

		return false;
	}, [selectedYear, selectedMonth]);

	const handlePrevious = () => {
		if (!canGoPrevious) {
			return;
		}

		if (selectedMonth === 0) {
			onMonthChange(11, selectedYear - 1);
		} else {
			onMonthChange(selectedMonth - 1, selectedYear);
		}
	};

	const handleNext = () => {
		if (!canGoNext) {
			return;
		}

		if (selectedMonth === 11) {
			onMonthChange(0, selectedYear + 1);
		} else {
			onMonthChange(selectedMonth + 1, selectedYear);
		}
	};

	const isBeforeRegistration = useMemo(() => {
		if (!earliestDate) {
			return false;
		}

		const earliestYear = earliestDate.getFullYear();
		const earliestMonth = earliestDate.getMonth();

		if (selectedYear < earliestYear) {
			return true;
		}
		if (selectedYear === earliestYear && selectedMonth < earliestMonth) {
			return true;
		}

		return false;
	}, [selectedYear, selectedMonth, earliestDate]);

	return (
		<div className={cn("flex items-center justify-between gap-4 rounded-lg border bg-card p-4", className)}>
			<Button
				variant="outline"
				size="icon"
				onClick={handlePrevious}
				disabled={!canGoPrevious}
				aria-label={t("previousMonth")}
				className="h-8 w-8"
			>
				{dir === "rtl" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
			</Button>

			<div className="flex flex-col items-center gap-1">
				<div className="text-sm font-medium text-muted-foreground">{t("label")}</div>
				<div className="flex items-center gap-2">
					<span className="text-lg font-bold">{tMonths(MONTH_KEYS[selectedMonth])}</span>
					<span className="text-lg font-bold text-muted-foreground">{selectedYear}</span>
				</div>
				{isBeforeRegistration && (
					<span className="text-xs text-destructive">{t("beforeRegistration")}</span>
				)}
			</div>

			<Button
				variant="outline"
				size="icon"
				onClick={handleNext}
				disabled={!canGoNext}
				aria-label={t("nextMonth")}
				className="h-8 w-8"
			>
				{dir === "rtl" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
			</Button>
		</div>
	);
}
