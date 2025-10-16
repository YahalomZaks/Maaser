import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import FeedbackPageClient from "./FeedbackPageClient";

type PageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return getPageMetadata(locale, "feedback");
}

export default async function FeedbackPage({ params }: PageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <FeedbackPageClient />;
}
