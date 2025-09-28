import type { CurrencyCode } from "@/types/finance";

export const USD_TO_ILS_RATE = 3.5;

const localeMap: Record<string, string> = {
	he: "he-IL",
	en: "en-US",
};

export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode, rate: number = USD_TO_ILS_RATE) {
	if (!Number.isFinite(amount)) {
		return 0;
	}
	if (from === to) {
		return amount;
	}
	if (from === "USD" && to === "ILS") {
		return amount * rate;
	}
	if (from === "ILS" && to === "USD") {
		return amount / rate;
	}
	return amount;
}

export function formatCurrency(amount: number, currency: CurrencyCode, locale: string) {
	const normalizedLocale = localeMap[locale] ?? (locale.startsWith("he") ? "he-IL" : "en-US");
	return new Intl.NumberFormat(normalizedLocale, {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(amount);
}

export function percentToDecimal(percent: number) {
	return percent / 100;
}
