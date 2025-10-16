import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import FeedbackSuccessPageClient from "./FeedbackSuccessPageClient";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "feedbackSuccess");
}

export default function FeedbackSuccessPage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <FeedbackSuccessPageClient />;
}
