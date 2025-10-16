import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { IncomeManager } from "@/components/dashboard/IncomeManager";
import { getPageMetadata } from "@/lib/seo";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "dashboardIncome");
}

export default function IncomePage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <IncomeManager />;
}
