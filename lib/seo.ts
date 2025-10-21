import type { Metadata, MetadataRoute } from "next";

import { locales, type Locale } from "@/i18n/request";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://maasroti.com").replace(/\/$/, "");
const DEFAULT_LOCALE: Locale = "he";

const LOGO_PATH = "/logo.png";
const CATEGORY = "Finance";

const SUPPORTED_LOCALES = new Set<Locale>(locales);

type PageKey =
	| "home"
	| "faq"
	| "terms"
	| "feedback"
	| "feedbackSuccess"
	| "signin"
	| "signup"
	| "dashboard"
	| "dashboardIncome"
	| "dashboardDonations"
	| "dashboardSettings"
	| "dashboardNotifications"
	| "onboarding";

type LocalizedSeoCopy = {
	readonly title: string;
	readonly description: string;
	readonly keywords?: string[];
};

type PageSeoConfig = {
	readonly path: string;
	readonly changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
	readonly priority?: number;
	readonly index?: boolean;
	readonly sitemap?: boolean;
	readonly locales: Record<Locale, LocalizedSeoCopy>;
};

type SiteLocaleMeta = {
	readonly siteName: string;
	readonly title: string;
	readonly description: string;
	readonly keywords: string[];
	readonly twitterTitle: string;
	readonly twitterDescription: string;
	readonly openGraphLocale: string;
};

export const LOCALE_SITE_META: Record<Locale, SiteLocaleMeta> = {
	he: {
		siteName: "מעשרותי",
		title: "מעשרותי | ניהול חכם של מעשרות אונליין",
		description:
			"מערכת חכמה לניהול מעשרות ותרומות – מחשבון מעשר אוטומטי שמחשב כמה להפריש בכל חודש לפי ההכנסות, עוקב אחרי התרומות, שולח תזכורות חכמות ומציג אם עמדתם ביעד. פשוט, נוח ובחינם.",
		keywords: [
			"מעשרותִי",
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
		twitterTitle: "מעשרותי | ניהול חכם של מעשרות אונליין",
		twitterDescription:
			"מערכת חכמה לניהול מעשרות ותרומות – מחשבון מעשר אוטומטי, מעקב תרומות ותזכורות חכמות. הכול פשוט, נוח ובחינם.",
		openGraphLocale: "he_IL",
	},
	en: {
		siteName: "Maasroti",
		title: "Maasroti | Smart Online Maaser Management",
		description:
			"Smart platform for managing maaser and donations – an automatic maaser calculator that shows how much to give each month, tracks donations, sends smart reminders, and shows whether you hit your goal. Simple, convenient, and free.",
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
		twitterTitle: "Maasroti | Smart Online Maaser Management",
		twitterDescription:
			"Automatic maaser calculator, donation tracking, smart reminders, and progress insights – everything you need in one simple, free platform.",
		openGraphLocale: "en_US",
	},
};

const PAGE_SEO_CONFIG: Record<PageKey, PageSeoConfig> = {
	home: {
		path: "",
		changeFrequency: "daily",
		priority: 1,
		locales: {
			he: {
				title: "מעשרותי | ניהול חכם של מעשרות אונליין",
				description:
					"מערכת חכמה לניהול מעשרות ותרומות – מחשבון מעשר אוטומטי שמחשב כמה להפריש בכל חודש לפי ההכנסות, עוקב אחרי התרומות, שולח תזכורות חכמות ומציג אם עמדתם ביעד. פשוט, נוח ובחינם.",
				keywords: [
					"ניהול מעשר",
					"מעקב תרומות",
					"ניהול צדקה",
					"מערכת מעשרות",
				],
			},
			en: {
				title: "Maasroti | Smart Online Maaser Management",
				description:
					"Smart platform for managing maaser and donations – an automatic maaser calculator that shows how much to give each month, tracks donations, sends smart reminders, and shows whether you hit your goal. Simple, convenient, and free.",
				keywords: ["maaser tracking", "donation management", "tithe software"],
			},
		},
	},
	faq: {
		path: "/faq",
		changeFrequency: "monthly",
		priority: 0.6,
		locales: {
			he: {
				title: "מעשרותִי | שאלות ותשובות נפוצות",
				description:
					"תשובות ברורות לכל השאלות הנפוצות על השימוש במערכת, ניהול תרומות והפרשת מעשר דרך מעשרותִי.",
				keywords: ["שאלות מעשר", "תמיכה מעשרותִי", "מדריך תרומות"],
			},
			en: {
				title: "Maasroti | Frequently Asked Questions",
				description:
					"Clear answers to the most common questions about managing donations, income tracking, and maaser inside Maasroti.",
				keywords: ["maaser questions", "maasroti help", "donation FAQ"],
			},
		},
	},
	terms: {
		path: "/terms",
		changeFrequency: "yearly",
		priority: 0.3,
		locales: {
			he: {
				title: "מעשרותִי | תנאי שימוש ומדיניות פרטיות",
				description:
					"קראו את תנאי השימוש והמדיניות של מעשרותִי כדי להבין כיצד אנו מגנים על פרטיותכם ומנהלים את השירות.",
				keywords: ["תנאי שימוש", "מדיניות פרטיות", "מעשרותִי"],
			},
			en: {
				title: "Maasroti | Terms of Service & Privacy Policy",
				description:
					"Review the terms of service and privacy policy that outline how Maasroti protects your data and delivers the platform.",
				keywords: ["maasroti terms", "maasroti privacy", "tithe app policy"],
			},
		},
	},
	feedback: {
		path: "/feedback",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | שליחת משוב ותמיכה",
				description:
					"שלחו משוב על חוויית השימוש במעשרותִי, דווחו על באגים או הציעו שיפורים לצוות התמיכה שלנו.",
				keywords: ["שליחת משוב", "תמיכה מעשרותִי", "דיווח באג"],
			},
			en: {
				title: "Maasroti | Send Feedback & Support Requests",
				description:
					"Share feedback about Maasroti, report issues, or suggest improvements directly to our support team.",
				keywords: ["maasroti feedback", "tithe support", "report bug"],
			},
		},
	},
	feedbackSuccess: {
		path: "/feedback/success",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | תודה על המשוב",
				description:
					"תודה ששלחתם משוב ועוזרים לנו לשפר את מעשרותִי. נשיב אליכם בהקדם במידת הצורך.",
				keywords: ["תודה על המשוב", "מעשרותִי"],
			},
			en: {
				title: "Maasroti | Thanks for Your Feedback",
				description:
					"Thanks for sharing your feedback with Maasroti. We'll review it and get back to you if needed.",
				keywords: ["feedback received", "maasroti"],
			},
		},
	},
	signin: {
		path: "/signin",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | התחברות לחשבון",
				description:
					"התחברו למערכת מעשרותִי כדי לנהל הכנסות, תרומות וחישובי מעשר בצורה מאובטחת.",
				keywords: ["התחברות מעשרותי", "כניסה למערכת"],
			},
			en: {
				title: "Maasroti | Sign In to Your Account",
				description:
					"Access your Maasroti workspace to track donations, incomes, and maaser calculations securely.",
				keywords: ["maasroti login", "tithe app sign in"],
			},
		},
	},
	signup: {
		path: "/signup",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | הרשמה למערכת",
				description:
					"צרו חשבון חדש במעשרותִי כדי להתחיל לנהל תרומות והפרשות מעשר באופן קל ומדויק.",
				keywords: ["הרשמה למעשרותי", "פתיחת חשבון מעשר"],
			},
			en: {
				title: "Maasroti | Create Your Free Account",
				description:
					"Sign up to Maasroti and start organising your donations, income tracking, and maaser planning in minutes.",
				keywords: ["maasroti sign up", "tithe software registration"],
			},
		},
	},
	dashboard: {
		path: "/dashboard",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | לוח הבקרה הראשי",
				description:
					"קבלו תמונת מצב עדכנית על הכנסות, תרומות והתחייבויות מעשר מתוך לוח הבקרה של מעשרותִי.",
				keywords: ["לוח בקרה מעשר", "ניהול מעשרות"],
			},
			en: {
				title: "Maasroti | Dashboard Overview",
				description:
					"Monitor income, donations, and maaser obligations within the Maasroti dashboard overview.",
				keywords: ["maasroti dashboard", "maaser overview"],
			},
		},
	},
	dashboardIncome: {
		path: "/dashboard/income",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | ניהול הכנסות",
				description:
					"עדכנו והנהלו את כל מקורות ההכנסה שלכם כדי לחשב את חובת המעשר במדויק.",
				keywords: ["ניהול הכנסות", "חישוב מעשר"],
			},
			en: {
				title: "Maasroti | Income Manager",
				description:
					"Track and manage income sources so Maasroti can calculate your maaser with precision.",
				keywords: ["income manager", "maaser income"],
			},
		},
	},
	dashboardDonations: {
		path: "/dashboard/donations",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | ניהול תרומות",
				description:
					"תעדו תרומות חדשות, עקבו אחר תרומות קבועות והבינו אם היעד החודשי שלכם הושג.",
				keywords: ["ניהול תרומות", "דוחות תרומות"],
			},
			en: {
				title: "Maasroti | Donations Manager",
				description:
					"Record new donations, manage recurring gifts, and see whether you meet your maaser goals.",
				keywords: ["donations manager", "tithe tracking"],
			},
		},
	},
	dashboardSettings: {
		path: "/dashboard/settings",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | הגדרות חשבון",
				description:
					"התאימו את ההגדרות האישיות, ההתראות והעדפות החישוב בחשבון מעשרותִי שלכם.",
				keywords: ["הגדרות חשבון", "התראות מעשר"],
			},
			en: {
				title: "Maasroti | Account Settings",
				description:
					"Adjust personal settings, notifications, and calculation preferences for your Maasroti account.",
				keywords: ["account settings", "maasroti preferences"],
			},
		},
	},
	dashboardNotifications: {
		path: "/dashboard/notifications",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | התראות ועדכונים",
				description:
					"מרכז ההתראות של מעשרותִי עם תזכורות לתרומות בתשלומים, הכנסות זמניות ועדכוני מערכת.",
				keywords: ["התראות מעשרות", "תזכורות תרומה"],
			},
			en: {
				title: "Maasroti | Notifications & Updates",
				description:
					"View smart reminders for installment donations, limited incomes, and system announcements inside Maasroti.",
				keywords: ["maasroti notifications", "tithe reminders"],
			},
		},
	},
	onboarding: {
		path: "/onboarding",
		index: false,
		sitemap: false,
		locales: {
			he: {
				title: "מעשרותִי | הגדרות ראשוניות",
				description:
					"עברו את תהליך ההתחלה של מעשרותִי כדי להגדיר פרופיל אישי, מקורות הכנסה ויעדי תרומות.",
				keywords: ["הגדרות ראשוניות", "onboarding מעשר"],
			},
			en: {
				title: "Maasroti | Getting Started Wizard",
				description:
					"Complete the Maasroti onboarding wizard to set up your profile, income sources, and giving goals.",
				keywords: ["maasroti onboarding", "setup wizard"],
			},
		},
	},
};

function ensureLeadingSlash(path: string): string {
	if (path === "") {
		return "";
	}
	return path.startsWith("/") ? path : `/${path}`;
}

function buildLocalizedPath(locale: Locale, path: string): string {
	const normalizedPath = ensureLeadingSlash(path);
	return `/${locale}${normalizedPath}`;
}

function buildAlternateLanguages(path: string) {
	const normalizedPath = ensureLeadingSlash(path);
	return Object.fromEntries(
		locales.map((locale) => [locale, `${BASE_URL}/${locale}${normalizedPath}`])
	);
}

export function resolveLocaleParam(locale: string | undefined | null): Locale {
	if (!locale) {
		return DEFAULT_LOCALE;
	}
	const candidate = locale as Locale;
	return SUPPORTED_LOCALES.has(candidate) ? candidate : DEFAULT_LOCALE;
}

export function getRootMetadata(locale: Locale): Metadata {
	const site = LOCALE_SITE_META[locale];

	return {
		title: {
			default: site.title,
			template: `%s | ${site.siteName}`,
		},
		description: site.description,
		keywords: site.keywords,
		applicationName: site.siteName,
		category: CATEGORY,
		authors: [{ name: site.siteName }],
		creator: site.siteName,
		publisher: site.siteName,
		robots: {
			index: true,
			follow: true,
		},
		icons: {
			icon: [
				{ url: "/favicon.png" },
				{ url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
			],
			apple: "/favicon.png",
		},
		alternates: {
			canonical: `${BASE_URL}/${locale}`,
			languages: buildAlternateLanguages(""),
		},
		openGraph: {
			type: "website",
			locale: site.openGraphLocale,
			title: site.title,
			description: site.description,
			siteName: site.siteName,
			url: `${BASE_URL}/${locale}`,
			images: [
				{
					url: `${BASE_URL}${LOGO_PATH}`,
					width: 512,
					height: 512,
					alt: site.siteName,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: site.twitterTitle,
			description: site.twitterDescription,
			images: [`${BASE_URL}${LOGO_PATH}`],
		},
		metadataBase: new URL(BASE_URL),
	};
}

export function getPageMetadata(localeParam: string, page: PageKey): Metadata {
	const locale = resolveLocaleParam(localeParam);
	const site = LOCALE_SITE_META[locale];
	const config = PAGE_SEO_CONFIG[page];
	const localized = config.locales[locale];
	const canonicalUrl = `${BASE_URL}${buildLocalizedPath(locale, config.path)}`;

	const metadata: Metadata = {
		title: localized.title,
		description: localized.description,
		keywords: localized.keywords ?? site.keywords,
		category: CATEGORY,
		alternates: {
			canonical: canonicalUrl,
			languages: buildAlternateLanguages(config.path),
		},
		openGraph: {
			type: "website",
			locale: site.openGraphLocale,
			title: localized.title,
			description: localized.description,
			siteName: site.siteName,
			url: canonicalUrl,
			images: [
				{
					url: `${BASE_URL}${LOGO_PATH}`,
					width: 512,
					height: 512,
					alt: site.siteName,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: localized.title,
			description: localized.description,
			images: [`${BASE_URL}${LOGO_PATH}`],
		},
	};

	if (config.index === false) {
		metadata.robots = {
			index: false,
			follow: false,
		};
	} else {
		metadata.robots = {
			index: true,
			follow: true,
		};
	}

	return metadata;
}

export function getOrganizationJsonLd(localeParam: string): Record<string, unknown> {
	const locale = resolveLocaleParam(localeParam);
	const site = LOCALE_SITE_META[locale];

	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: site.siteName,
		description: site.description,
		url: BASE_URL,
		logo: `${BASE_URL}${LOGO_PATH}`,
	};
}

export function buildSitemapEntries(): MetadataRoute.Sitemap {
	const lastModified = new Date();
	const sitemapEntries: MetadataRoute.Sitemap = [];

	(Object.entries(PAGE_SEO_CONFIG) as [PageKey, PageSeoConfig][]).forEach(([_, config]) => {
		const shouldInclude = config.sitemap ?? config.index !== false;
		if (!shouldInclude) {
			return;
		}

		locales.forEach((locale) => {
			const localizedUrl = `${BASE_URL}${buildLocalizedPath(locale, config.path)}`;
			sitemapEntries.push({
				url: localizedUrl,
				lastModified,
				changeFrequency: config.changeFrequency ?? "monthly",
				priority: config.priority ?? 0.5,
				alternates: {
					languages: buildAlternateLanguages(config.path),
				},
			});
		});
	});

	return sitemapEntries;
}
