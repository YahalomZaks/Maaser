import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import OnboardingPageClient from "./OnboardingPageClient";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "onboarding");
}

export default function OnboardingPage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <OnboardingPageClient />;
}
