"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface YearSelectorModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedYear: number;
	onYearSelect: (year: number) => void;
	availableYears?: number[]; // Optional list of years with data
	earliestYear?: number; // Registration year
}

const YEARS_PER_PAGE = 12;

export function YearSelectorModal({
	open,
	onOpenChange,
	selectedYear,
	onYearSelect,
	availableYears,
	earliestYear,
}: YearSelectorModalProps) {
	const locale = useLocale();
	const t = useTranslations("dashboard.yearSelector");
	const dir = locale.startsWith("he") ? "rtl" : "ltr";

	const currentYear = new Date().getFullYear();
	const startYear = earliestYear ?? currentYear - 5;

	const [pageStartYear, setPageStartYear] = useState(() => {
		// Center the selected year in the current page
		const pageIndex = Math.floor((selectedYear - startYear) / YEARS_PER_PAGE);
		return startYear + pageIndex * YEARS_PER_PAGE;
	});

	const yearsOnPage = Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStartYear + i);

	const canGoPrevious = earliestYear ? pageStartYear > earliestYear : pageStartYear > startYear;
	const canGoNext = pageStartYear + YEARS_PER_PAGE <= currentYear;

	const handlePrevious = () => {
		if (canGoPrevious) {
			setPageStartYear((prev) => prev - YEARS_PER_PAGE);
		}
	};

	const handleNext = () => {
		if (canGoNext) {
			setPageStartYear((prev) => prev + YEARS_PER_PAGE);
		}
	};

	const handleYearSelect = (year: number) => {
		onYearSelect(year);
		onOpenChange(false);
	};

	const isYearDisabled = (year: number) => {
		if (earliestYear && year < earliestYear) {
			return true;
		}
		if (year > currentYear) {
			return true;
		}
		if (availableYears && !availableYears.includes(year)) {
			return true;
		}
		return false;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md" dir={dir}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CalendarDays className="h-5 w-5" />
						{t("title")}
					</DialogTitle>
					<DialogDescription>{t("selectYear")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Navigation */}
					<div className="flex items-center justify-between">
						<Button
							variant="outline"
							size="sm"
							onClick={handlePrevious}
							disabled={!canGoPrevious}
							aria-label={t("previousYears")}
						>
							{dir === "rtl" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
							<span className="ms-2">{t("previousYears")}</span>
						</Button>

						<div className="text-sm font-medium text-muted-foreground">
							{pageStartYear} - {pageStartYear + YEARS_PER_PAGE - 1}
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={handleNext}
							disabled={!canGoNext}
							aria-label={t("nextYears")}
						>
							<span className="me-2">{t("nextYears")}</span>
							{dir === "rtl" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
						</Button>
					</div>

					{/* Year Grid */}
					<div className="grid grid-cols-3 gap-3">
						{yearsOnPage.map((year) => {
							const isDisabled = isYearDisabled(year);
							const isSelected = year === selectedYear;

							return (
								<Button
									key={year}
									variant={isSelected ? "default" : "outline"}
									className={cn(
										"h-16 text-base font-semibold",
										isDisabled && "cursor-not-allowed opacity-40",
									)}
									disabled={isDisabled}
									onClick={() => handleYearSelect(year)}
								>
									{year}
								</Button>
							);
						})}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
