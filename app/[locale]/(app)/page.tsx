import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { auth } from "@/lib/auth";
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

	const requestHeaders = await headers();
	const session = await auth.api.getSession({ headers: requestHeaders });

	if (session?.user) {
		redirect(`/${locale}/dashboard`);
	}
	return <HomePageContent />;
}
