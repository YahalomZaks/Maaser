import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import HomePageContent from "./HomePageContent";

type PageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "home");
}

export default async function HomePage({ params }: PageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <HomePageContent />;
}
