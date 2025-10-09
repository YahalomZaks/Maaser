import type { Metadata } from "next";
import { Heebo, Inter, Lato } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Suspense } from "react";

import Navbar from "@/components/shared/navbar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/themeProviders";

import "./globals.css";

const interFont = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700", "800"],
	display: "swap",
});

const heeboFont = Heebo({
	variable: "--font-heebo",
	subsets: ["hebrew", "latin"],
	weight: ["300", "400", "500", "600", "700"],
	display: "swap",
});

const latoFont = Lato({
	variable: "--font-lato",
	subsets: ["latin"],
	weight: ["400", "700"],
	display: "swap",
});

const META_BY_LOCALE: Record<"he" | "en", {
	title: string;
	description: string;
	keywords: string[];
	siteName: string;
	twitterTitle: string;
	twitterDescription: string;
	openGraphLocale: string;
}> = {
	he: {
		title: "מעשרותי",
		description:
			"מעשרותי מאפשרת לנהל הכנסות, תרומות וחישובי מעשר בצורה יעילה ומדויקת – כולל מעקב חודשי, דוחות, תזכורות וכלי חישוב הלכתיים.",
		keywords: [
			"מעשרותי",
			"מעשר",
			"חישוב מעשרות",
			"מעשרות הכנסה",
			"הפרשת מעשר",
			"ניהול מעשרות",
			"ניהול תרומות",
			"ניהול צדקה",
			"חישוב צדקה",
			"רישום תרומות",
			"מעקב תרומות",
			"תכנון תרומות",
			"דוחות מעשרות",
			"סכום מעשר",
			"מחשבון מעשר",
		],
		siteName: "מעשרותי",
		twitterTitle: "מעשרותי – מערכת דיגיטלית לניהול וחישוב מעשרות",
		twitterDescription:
			"כלים חכמים לניהול הכנסות ותרומות, מעקב אחרי הפרשת מעשר ודוחות מפורטים בעברית.",
		openGraphLocale: "he_IL",
	},
	en: {
		title: "Maasroti",
		description:
			"Maasroti helps you track income, donations, and maaser obligations with automated calculations, clear dashboards, and reminders.",
		keywords: [
			"Maasroti",
			"maaser calculator",
			"tithe calculator",
			"tithe management",
			"donation tracker",
			"charity management",
			"maaser tracking",
			"maaser planning",
			"automatic maaser",
			"income tithe",
			"charity reports",
			"donation budgeting",
			"tzedakah calculator",
			"tzedakah management",
			"generosity planning",
		],
		siteName: "Maasroti",
		twitterTitle: "Maasroti – Manage Your Maaser & Donations Smarter",
		twitterDescription:
			"Track income, donations, and maaser obligations with automated calculations, reminders, and multilingual dashboards.",
		openGraphLocale: "en_US",
	},
};

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale();
	const key = locale === "he" ? "he" : "en";
	const meta = META_BY_LOCALE[key];

	return {
		title: meta.title,
		description: meta.description,
		keywords: meta.keywords,
		authors: [{ name: meta.siteName }],
		creator: meta.siteName,
		publisher: meta.siteName,
		robots: {
			index: true,
			follow: true,
		},
		icons: {
			icon: "/logo.png",
			apple: "/logo.png",
			shortcut: "/logo.png",
		},
		openGraph: {
			type: "website",
			locale: meta.openGraphLocale,
			title: meta.title,
			description: meta.description,
			siteName: meta.siteName,
		},
		twitter: {
			card: "summary_large_image",
			title: meta.twitterTitle,
			description: meta.twitterDescription,
		},
	};
}

// Mark the root layout as dynamic to allow request-scoped locale/messages
// and avoid static optimization errors during production builds.
export const dynamic = "force-dynamic";

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getLocale();
	const messages = await getMessages();
	const isRTL = locale === "he";

	return (
		<html lang={locale} dir={isRTL ? "rtl" : "ltr"} suppressHydrationWarning>
			<head>
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
				<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" defer />
				<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" defer />
			</head>
			<body
				className={`${interFont.variable} ${heeboFont.variable} ${latoFont.variable} ${latoFont.className} antialiased bg-neutral-50 text-neutral-900 min-h-screen`}
				suppressHydrationWarning
			>
				<NextIntlClientProvider locale={locale} messages={messages}>
						<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light" disableTransitionOnChange>
						<Suspense fallback={null}>
							<Navbar />
						</Suspense>
							<main className="app-main relative">
							{children}
						</main>
						<Toaster richColors />
					</ThemeProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
