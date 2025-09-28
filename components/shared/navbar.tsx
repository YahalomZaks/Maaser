"use client";

import {
	ChartLine,
	ChevronDown,
	GaugeCircle,
	HandCoins,
	LayoutDashboard,
	LogOut,
	Menu,
	Settings,
	User,
	UserCircle,
	Wallet,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { signOut, useSession } from "@/lib/auth-client";

import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
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

const Navbar = () => {
	const { data: session, isPending } = useSession();
	const t = useTranslations("navigation");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();

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
			{
				key: "settings",
				label: t("settings"),
				icon: <Settings className="h-4 w-4" />,
				href: `${localePrefix}/dashboard/settings`,
				basePath: "/dashboard/settings",
			},
		];
	}, [isAuthenticated, localePrefix, t]);

	const isActive = useCallback(
		(basePath: string) => {
			if (!normalizedPath) {
				return basePath === "/dashboard";
			}
			if (normalizedPath === "") {
				return basePath === "/dashboard";
			}
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

	const scrollToElement = useCallback((id: string) => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, []);

	const scrollToFooter = useCallback(() => {
		const footerElement = document.querySelector("footer");
		if (footerElement) {
			footerElement.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, []);

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

	const userName = session?.user?.name || session?.user?.email?.split("@")[0] || t("profile");
	const userEmail = session?.user?.email;

	const renderAuthenticatedNav = () => (
		<nav className={`dashboard-navbar${isMobileMenuOpen ? " menu-open" : ""}`}>
			<div className="dashboard-nav-container">
				<div className="dashboard-logo">
					<div className="dashboard-logo-icon">
						<GaugeCircle className="h-5 w-5" />
					</div>
					<Link href={`${localePrefix}/dashboard`} className="dashboard-logo-link">
						{t("appName")}
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
					<div className="dashboard-language">
						<LanguageSwitcher />
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="dashboard-user-trigger" aria-label={t("profile")}>
								<UserCircle className="h-6 w-6" />
								<div className="dashboard-user-meta">
									<span className="dashboard-user-name">{userName}</span>
									{userEmail ? <span className="dashboard-user-email">{userEmail}</span> : null}
								</div>
								<ChevronDown className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-60">
							<DropdownMenuLabel>{t("profile")}</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href={`${localePrefix}/dashboard/profile`} className="flex items-center gap-2">
									<User className="h-4 w-4" />
									<span>{t("profile")}</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href={`${localePrefix}/dashboard/settings`} className="flex items-center gap-2">
									<Settings className="h-4 w-4" />
									<span>{t("settings")}</span>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
								<LogOut className="h-4 w-4" />
								<span>{t("logout")}</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
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
					</nav>
					<div className="dashboard-mobile-profile">
						<p className="dashboard-mobile-name">{userName}</p>
						{userEmail ? <p className="dashboard-mobile-email">{userEmail}</p> : null}
					</div>
					<button type="button" className="dashboard-mobile-logout" onClick={handleLogout}>
						{t("logout")}
					</button>
					<LanguageSwitcher variant="mobile" onLocaleChange={() => setIsMobileMenuOpen(false)} />
				</div>
			) : null}
		</nav>
	);

	const renderPublicNav = () => (
		<nav className={`welcome-navbar${isMobileMenuOpen ? " menu-open" : ""}`}>
			<div className="welcome-nav-container">
				<div className="welcome-logo">
					<div className="welcome-logo-icon">
						<ChartLine className="h-6 w-6" />
					</div>
					<Link href={`/${locale}`} className="welcome-logo-link">
						<span>{t("appName")}</span>
					</Link>
				</div>
				<div className="welcome-nav-actions">
					<div className="welcome-nav-links">
						<button type="button" onClick={() => scrollToElement("features")} className="welcome-nav-link">
							{t("features")}
						</button>
						<button type="button" onClick={() => scrollToElement("tech")} className="welcome-nav-link">
							{t("technology")}
						</button>
						<button type="button" onClick={scrollToFooter} className="welcome-nav-link">
							{t("contact", { default: "" }) || "יצירת קשר"}
						</button>
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
					<div className="welcome-mobile-links">
						<button type="button" onClick={() => scrollToElement("features")} className="welcome-mobile-link">
							{t("features")}
						</button>
						<button type="button" onClick={() => scrollToElement("tech")} className="welcome-mobile-link">
							{t("technology")}
						</button>
						<button type="button" onClick={scrollToFooter} className="welcome-mobile-link">
							{t("contact", { default: "" }) || "יצירת קשר"}
						</button>
					</div>
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
							<ChartLine className="h-6 w-6" />
						</div>
						<span>מעשרות</span>
					</div>
				</div>
			</nav>
		);
	}

	return isAuthenticated ? renderAuthenticatedNav() : renderPublicNav();
};

export default Navbar;
