import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import FaqPageClient from "./FaqPageClient";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "faq");
}

export default function FAQPage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <FaqPageClient />;
}
