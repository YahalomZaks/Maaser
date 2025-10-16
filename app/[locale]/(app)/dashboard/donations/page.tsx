import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { DonationsManager } from "@/components/dashboard/DonationsManager";
import { getPageMetadata } from "@/lib/seo";

type DonationsPageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: DonationsPageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "dashboardDonations");
}

export default async function DonationsPage({ params }: DonationsPageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <DonationsManager />;
}
