import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { IncomeManager } from "@/components/dashboard/IncomeManager";
import { getPageMetadata } from "@/lib/seo";

type IncomePageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: IncomePageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "dashboardIncome");
}

export default async function IncomePage({ params }: IncomePageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <IncomeManager />;
}
