import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { getPageMetadata } from "@/lib/seo";

type DashboardPageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: DashboardPageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "dashboard");
}

export default async function DashboardPage({ params }: DashboardPageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <DashboardOverview />;
}
