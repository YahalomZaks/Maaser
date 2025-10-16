import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { getPageMetadata } from "@/lib/seo";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "dashboard");
}

export default function DashboardPage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <DashboardOverview />;
}
