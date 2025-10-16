import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { SettingsManager } from "@/components/dashboard/SettingsManager";
import { getPageMetadata } from "@/lib/seo";

type SettingsPageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SettingsPageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "dashboardSettings");
}

export default async function SettingsPage({ params }: SettingsPageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <SettingsManager />;
}
