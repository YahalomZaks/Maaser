import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPageMetadata } from "@/lib/seo";

import HomePageContent from "./HomePageContent";

type PageProps = {
	params: { locale: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	return getPageMetadata(params.locale, "home");
}

export default function HomePage({ params }: PageProps) {
	setRequestLocale(params.locale);
	return <HomePageContent />;
}
