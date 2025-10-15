"use client";

import {
	ChevronDown,
	HandCoins,
	LayoutDashboard,
	LogOut,
	Menu,
	Settings,
	UserCircle,
	Wallet,
	X,
	MessageCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { signOut, useSession } from "@/lib/auth-client";
import logo from "@/public/logo.png";

import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { LanguageSwitcher } from "./LanguageSwitcher";

type NavItem = {
	key: string;
	label: string;
	icon: ReactNode;
	href: string;
	basePath: string;
};

type SupportedLanguage = "he" | "en";

const Navbar = () => {
	const { data: session, isPending } = useSession();
	const t = useTranslations("navigation");
	const tFeedback = useTranslations("feedback");
	const tCommon = useTranslations("common");
	const tLang = useTranslations("settings.language");
	const locale = useLocale();
	const isRTL = locale === "he";
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [isMounted, setIsMounted] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [pathname]);

	const localePrefix = `/${locale}`;
	const isAuthenticated = Boolean(session);
	const appName = t("appName");
	const logoAlt = locale === "he" ? "לוגו מעשרותִי" : "Maasroti logo";

	const normalizedPath = useMemo(() => {
		if (!pathname) {
			return "";
		}
		return pathname.replace(/^\/(he|en)(?=\/|$)/, "");
	}, [pathname]);

	const authNavItems: NavItem[] = useMemo(() => {
		if (!isAuthenticated) {
			return [];
		}
		return [
			{
				key: "dashboard",
				label: t("dashboard"),
				icon: <LayoutDashboard className="h-4 w-4" />,
				href: `${localePrefix}/dashboard`,
				basePath: "/dashboard",
			},
			{
				key: "income",
				label: t("income"),
				icon: <Wallet className="h-4 w-4" />,
				href: `${localePrefix}/dashboard/income`,
				basePath: "/dashboard/income",
			},
			{
				key: "donations",
				label: t("donations"),
				icon: <HandCoins className="h-4 w-4" />,
				href: `${localePrefix}/dashboard/donations`,
				basePath: "/dashboard/donations",
			},
		];
	}, [isAuthenticated, localePrefix, t]);

	const isActive = useCallback(
		(basePath: string) => {
			// Default root highlighting when path is unknown or exactly locale root
			if (!normalizedPath || normalizedPath === "") {
				return basePath === "/dashboard";
			}

			// Do not mark Dashboard as active on sub-pages like /dashboard/income or /dashboard/donations
			if (basePath === "/dashboard") {
				return normalizedPath === "/dashboard";
			}

			// For other sections, consider exact match or nested routes under that section
			return normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`);
		},
		[normalizedPath],
	);

	const handleLogout = useCallback(async () => {
		await signOut({
			fetchOptions: {
				onSuccess: () => {
					toast.success(t("logoutSuccess"));
					router.push(`${localePrefix}/signin`);
				},
				onError: (error) => {
					toast.error(error.error.message);
				},
			},
		});
		setIsMobileMenuOpen(false);
	}, [localePrefix, router, t]);

	// Removed unused helpers (smooth scroll) to keep navbar lean

	const publicAuthControls: ReactNode = useMemo(() => {
		if (isPending) {
			return <div className="welcome-btn welcome-btn-secondary">{tCommon("loading")}</div>;
		}

		return (
			<>
				<Link href={`/${locale}/signin`} className="welcome-btn welcome-btn-secondary">
					{t("login")}
				</Link>
				<Link href={`/${locale}/signup`} className="welcome-btn welcome-btn-primary">
					{t("signup")}
				</Link>
			</>
		);
	}, [isPending, locale, t, tCommon]);

	const publicMobileControls: ReactNode = useMemo(() => {
		if (isPending) {
			return <div className="welcome-mobile-auth-note">{tCommon("loading")}</div>;
		}

		return (
			<div className="welcome-mobile-auth-buttons">
				<Link href={`/${locale}/signin`} onClick={() => setIsMobileMenuOpen(false)} className="welcome-btn welcome-btn-secondary">
					{t("login")}
				</Link>
				<Link href={`/${locale}/signup`} onClick={() => setIsMobileMenuOpen(false)} className="welcome-btn welcome-btn-primary">
					{t("signup")}
				</Link>
			</div>
		);
	}, [isPending, locale, t, tCommon]);

	const fallbackAccountLabel = useMemo(() => (locale === "he" ? "חשבון" : "Account"), [locale]);
	const userName = session?.user?.name || session?.user?.email?.split("@")[0] || fallbackAccountLabel;
	const userEmail = session?.user?.email;

	// Language options and helpers (mirrors LanguageSwitcher behavior)
	const languages = useMemo(
		() => [
			{ code: "he" as SupportedLanguage, label: tLang("hebrew"), flag: "🇮🇱" },
			{ code: "en" as SupportedLanguage, label: tLang("english"), flag: "🇺🇸" },
		],
		[tLang],
	);

	const buildLocalizedPath = useCallback(
		(nextLocale: SupportedLanguage) => {
			const segments = pathname.split("/").filter(Boolean);
			if (segments.length === 0) {
				segments.push(nextLocale);
			} else if (languages.some((language) => language.code === (segments[0] as SupportedLanguage))) {
				segments[0] = nextLocale;
			} else {
				segments.unshift(nextLocale);
			}
			const search = searchParams?.toString() ?? "";
			return `/${segments.join("/")}${search ? `?${search}` : ""}`;
		},
		[languages, pathname, searchParams],
	);

	const handleDesktopLanguageChange = useCallback(
		(nextLocale: SupportedLanguage) => {
			if (locale === nextLocale) {
				return;
			}
			const targetPath = buildLocalizedPath(nextLocale);
			router.push(targetPath);
			router.refresh();
			if (session?.user) {
				fetch("/api/settings/language", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ language: nextLocale.toUpperCase() }),
				}).catch((error) => console.error("Failed to persist language preference", error));
			}
		},
		[buildLocalizedPath, locale, router, session?.user],
	);

	const renderAuthenticatedNav = () => (
		<nav className={`dashboard-navbar${isMobileMenuOpen ? " menu-open" : ""}`}>
			<div className="dashboard-nav-container">
				<div className="dashboard-logo hidden md:flex">
					<div className="dashboard-logo-icon">
						<Image src={logo} alt={logoAlt} priority className="h-full w-full object-contain" />
					</div>
					<Link href={`${localePrefix}/dashboard`} className="dashboard-logo-link">
						{appName}
					</Link>
				</div>
				<div className="dashboard-nav-links">
					{authNavItems.map((item) => (
						<Link
							key={item.key}
							href={item.href}
							onClick={() => setIsMobileMenuOpen(false)}
							className={`dashboard-nav-link${isActive(item.basePath) ? " is-active" : ""}`}
						>
							<span className="dashboard-nav-link-icon" aria-hidden>
								{item.icon}
							</span>
							<span className="dashboard-nav-link-label">{item.label}</span>
						</Link>
					))}
				</div>
				<div className="dashboard-actions">
					{/* Desktop-only user dropdown */}
					<div className="hidden md:block">
						<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="dashboard-user-trigger welcome-btn welcome-btn-secondary"
								aria-label={userName}
							>
								<UserCircle className="h-5 w-5" />
								<span className="dashboard-user-name">{userName}</span>
								<ChevronDown className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent 
							align="end" 
							side="bottom"
							sideOffset={8}
							alignOffset={-16}
							style={{ direction: isRTL ? "rtl" : "ltr" }} 
							className="w-72 sm:w-80 p-0"
						>
							{/* Profile Header */}
							<div className="dropdown-profile-header">
								<div className="dropdown-profile-avatar">
									<span className="dropdown-profile-initial">
										{userName.charAt(0).toUpperCase()}
									</span>
								</div>
								<div className="dropdown-profile-info">
									<div className="dropdown-profile-name">{userName}</div>
									{userEmail ? (
										<div className="dropdown-profile-email">{userEmail}</div>
									) : null}
								</div>
							</div>
							<DropdownMenuSeparator className="mx-0" />
							{/* Language submenu */}
							<div className="dropdown-menu-items">
								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="dropdown-menu-link">
										<span className="inline-flex items-center gap-2">
											<span aria-hidden className="text-base" style={{ fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif' }}>
												{locale === "he" ? "🇮🇱" : "🇺🇸"}
											</span>
											<span>{locale === "he" ? "שפה" : "Language"}</span>
										</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="w-48" style={{ direction: isRTL ? "rtl" : "ltr" }}>
										{languages.map((lng) => (
											<DropdownMenuItem
												key={lng.code}
												onClick={() => handleDesktopLanguageChange(lng.code)}
												className={`dropdown-menu-link justify-between ${locale === lng.code ? "bg-blue-50 text-blue-700" : ""}`}
											>
												<span className="inline-flex items-center gap-2">
													<span aria-hidden className="text-base" style={{ fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif' }}>
														{lng.flag}
													</span>
													<span>{lng.label}</span>
												</span>
												{locale === lng.code ? (
													<span className="text-blue-600 text-sm font-semibold">✓</span>
												) : null}
											</DropdownMenuItem>
										))}
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							</div>
							<DropdownMenuSeparator className="mx-0" />
							<div className="dropdown-menu-items">
								<DropdownMenuItem asChild>
									<Link href={`${localePrefix}/dashboard/settings`} className="dropdown-menu-link">
										<Settings className="h-4 w-4" />
										<span>{t("settings")}</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<Link href={`${localePrefix}/feedback`} className="dropdown-menu-link">
										<MessageCircle className="h-4 w-4" />
										<span>{tFeedback("feedbackMenu")}</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator className="mx-0" />
								<DropdownMenuItem onClick={handleLogout} className="dropdown-menu-link text-destructive focus:text-destructive">
									<LogOut className="h-4 w-4" />
									<span>{t("logout")}</span>
								</DropdownMenuItem>
							</div>
						</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<button
						type="button"
						className="dashboard-mobile-toggle"
						onClick={() => setIsMobileMenuOpen((prev) => !prev)}
						aria-label="Toggle navigation"
						aria-expanded={isMobileMenuOpen}
					>
						{isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>
			</div>
			{isMobileMenuOpen ? (
				<div className="dashboard-mobile-menu">
					<nav className="dashboard-mobile-links">
						{authNavItems.map((item) => (
							<Link
								key={item.key}
								href={item.href}
								onClick={() => setIsMobileMenuOpen(false)}
								className={`dashboard-mobile-link${isActive(item.basePath) ? " is-active" : ""}`}
							>
								<span className="inline-flex items-center gap-2">
									{item.icon}
									{item.label}
								</span>
							</Link>
						))}
						{/* Settings link in mobile menu */}
						<Link
							href={`${localePrefix}/dashboard/settings`}
							onClick={() => setIsMobileMenuOpen(false)}
							className={`dashboard-mobile-link${isActive("/dashboard/settings") ? " is-active" : ""}`}
						>
							<span className="inline-flex items-center gap-2">
								<Settings className="h-4 w-4" />
								{t("settings")}
							</span>
						</Link>
						{/* Feedback link in mobile menu */}
						<Link
							href={`${localePrefix}/feedback`}
							onClick={() => setIsMobileMenuOpen(false)}
							className={`dashboard-mobile-link${isActive("/feedback") ? " is-active" : ""}`}
						>
							<span className="inline-flex items-center gap-2">
								<MessageCircle className="h-4 w-4" />
								{tFeedback("feedbackMenu")}
							</span>
						</Link>
					</nav>
					<div className="dashboard-mobile-profile">
						<p className="dashboard-mobile-name">{userName}</p>
						{userEmail ? <p className="dashboard-mobile-email">{userEmail}</p> : null}
					</div>
					<LanguageSwitcher variant="mobile" onLocaleChange={() => setIsMobileMenuOpen(false)} />
					<button type="button" className="dashboard-mobile-logout" onClick={handleLogout}>
						{t("logout")}
					</button>
				</div>
			) : null}
		</nav>
	);

	const renderPublicNav = () => (
		<nav className={`welcome-navbar${isMobileMenuOpen ? " menu-open" : ""}`}>
			<div className="welcome-nav-container">
				<div className="welcome-logo">
					<div className="welcome-logo-icon">
						<Image src={logo} alt={logoAlt} priority className="h-full w-full object-contain" />
					</div>
					<Link href={`/${locale}`} className="welcome-logo-link">
						<span>{appName}</span>
					</Link>
				</div>
				<div className="welcome-nav-actions">
					<div className="welcome-nav-links">
						
						<LanguageSwitcher onLocaleChange={() => setIsMobileMenuOpen(false)} />
						{publicAuthControls}
					</div>
					<button
						type="button"
						className="welcome-mobile-toggle"
						onClick={() => setIsMobileMenuOpen((prev) => !prev)}
						aria-label="Toggle navigation"
						aria-expanded={isMobileMenuOpen}
					>
						{isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>
			</div>
			{isMobileMenuOpen && (
				<div className="welcome-mobile-menu">
					<div className="welcome-mobile-links" />
					<LanguageSwitcher variant="mobile" onLocaleChange={() => setIsMobileMenuOpen(false)} />
					{publicMobileControls}
				</div>
			)}
		</nav>
	);

	if (!isMounted) {
		return (
			<nav className="welcome-navbar" aria-hidden>
				<div className="welcome-nav-container">
					<div className="welcome-logo">
						<div className="welcome-logo-icon">
							<Image src={logo} alt={logoAlt} priority className="h-full w-full object-contain" />
						</div>
						<span>{appName}</span>
					</div>
				</div>
			</nav>
		);
	}

	return isAuthenticated ? renderAuthenticatedNav() : renderPublicNav();
};

export default Navbar;
