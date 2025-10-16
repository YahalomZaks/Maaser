import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import FaqPageClient from "./FaqPageClient";

type PageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "faq");
}

export default async function FAQPage({ params }: PageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <FaqPageClient />;
}
