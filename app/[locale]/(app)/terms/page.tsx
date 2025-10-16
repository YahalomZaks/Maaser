import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import TermsPageClient from "./TermsPageClient";

type PageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "terms");
}

export default async function TermsPage({ params }: PageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <TermsPageClient />;
}
