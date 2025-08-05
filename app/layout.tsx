import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/themeProviders";
import Navbar from "@/components/shared/Navbar";

import "./globals.css";

const latoFont = Lato({
	subsets: ["latin"],
	weight: ["400", "700"],
});

export const metadata: Metadata = {
	title: "Ma'aser Management System",
	description: "מערכת ניהול מעשרות - ניהול ומעקב אחר מעשרות בצורה פשוטה ומסודרת",
	keywords: ["מעשר", "צדקה", "ma'aser", "tithe", "charity", "donation management"],
	authors: [
		{
			name: "Ma'aser System",
		},
	],
	creator: "Ma'aser Management System",
	publisher: "Ma'aser Management System",
	robots: {
		index: true,
		follow: true,
	},
	openGraph: {
		type: "website",
		locale: "he_IL",
		title: "מערכת ניהול מעשרות",
		description: "מערכת ניהול מעשרות - ניהול ומעקב אחר מעשרות בצורה פשוטה ומסודרת",
		siteName: "Ma'aser Management System",
	},
	twitter: {
		card: "summary_large_image",
		title: "מערכת ניהול מעשרות",
		description: "מערכת ניהול מעשרות - ניהול ומעקב אחר מעשרות בצורה פשוטה ומסודרת",
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getLocale();
	const messages = await getMessages();
	const isRTL = locale === 'he';

	return (
		<html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Heebo:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
				<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" defer />
				<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" defer />
			</head>
			<body className={`${latoFont.className} antialiased`}>
				<NextIntlClientProvider locale={locale} messages={messages}>
					<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
						<Navbar />
						<main style={{ paddingTop: 'var(--navbar-height, 80px)' }}>
							{children}
						</main>
						<Toaster richColors />
					</ThemeProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
