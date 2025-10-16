import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import FeedbackPageClient from "./FeedbackPageClient";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "feedback");
}

export default function FeedbackPage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <FeedbackPageClient />;
}
