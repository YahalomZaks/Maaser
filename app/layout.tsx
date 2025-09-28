import type { Metadata } from "next";
import { Heebo, Inter, Lato } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

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
	const isRTL = locale === "he";

	return (
		<html lang={locale} dir={isRTL ? "rtl" : "ltr"} suppressHydrationWarning>
			<head>
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
				<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" defer />
				<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" defer />
			</head>
			<body
				className={`${interFont.variable} ${heeboFont.variable} ${latoFont.variable} ${latoFont.className} antialiased`}
				suppressHydrationWarning
			>
				<NextIntlClientProvider locale={locale} messages={messages}>
					<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
						<Navbar />
						<main style={{ paddingTop: "var(--navbar-height, 80px)" }}>
							{children}
						</main>
						<Toaster richColors />
					</ThemeProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
