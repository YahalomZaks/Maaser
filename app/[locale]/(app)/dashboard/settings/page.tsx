import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { SettingsManager } from "@/components/dashboard/SettingsManager";
import { getPageMetadata } from "@/lib/seo";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "dashboardSettings");
}

export default function SettingsPage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <SettingsManager />;
}
