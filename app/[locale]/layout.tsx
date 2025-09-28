import { notFound } from "next/navigation";

import { locales, type Locale } from "@/i18n/request";

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

type Props = {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
	const { locale } = await params;

	if (!isLocale(locale)) {
		notFound();
	}

	return children;
}
