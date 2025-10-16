import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import TermsPageClient from "./TermsPageClient";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "terms");
}

export default function TermsPage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <TermsPageClient />;
}
