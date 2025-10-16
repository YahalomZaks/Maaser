import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { DonationsManager } from "@/components/dashboard/DonationsManager";
import { getPageMetadata } from "@/lib/seo";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "dashboardDonations");
}

export default function DonationsPage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <DonationsManager />;
}
