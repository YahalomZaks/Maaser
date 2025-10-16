import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import FeedbackSuccessPageClient from "./FeedbackSuccessPageClient";

type PageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "feedbackSuccess");
}

export default async function FeedbackSuccessPage({ params }: PageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <FeedbackSuccessPageClient />;
}
