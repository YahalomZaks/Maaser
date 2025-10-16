import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import OnboardingPageClient from "./OnboardingPageClient";

type PageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "onboarding");
}

export default async function OnboardingPage({ params }: PageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <OnboardingPageClient />;
}
