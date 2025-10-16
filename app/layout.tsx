import type { Metadata } from "next";
import { Heebo, Inter, Lato } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Suspense } from "react";

import Navbar from "@/components/shared/navbar";
import { Toaster } from "@/components/ui/sonner";
import { getOrganizationJsonLd, getRootMetadata, resolveLocaleParam } from "@/lib/seo";
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

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale();
	const normalized = resolveLocaleParam(locale);
	return getRootMetadata(normalized);
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
	const normalizedLocale = resolveLocaleParam(locale);
	const messages = await getMessages();
	const isRTL = normalizedLocale === "he";
	const organizationJsonLd = getOrganizationJsonLd(normalizedLocale);

	return (
		<html lang={normalizedLocale} dir={isRTL ? "rtl" : "ltr"} suppressHydrationWarning>
			<head>
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
				<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" defer />
				<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" defer />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
				/>
			</head>
			<body
				className={`${interFont.variable} ${heeboFont.variable} ${latoFont.variable} ${latoFont.className} antialiased bg-neutral-50 text-neutral-900 min-h-screen`}
				suppressHydrationWarning
			>
				<NextIntlClientProvider locale={normalizedLocale} messages={messages}>
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
