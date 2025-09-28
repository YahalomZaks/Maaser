"use client";

import {
	ChartLine,
	ChevronDown,
	LogOut,
	Menu,
	Settings,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { signOut, useSession } from "@/lib/auth-client";

import { LanguageSwitcher } from "./LanguageSwitcher";

const Navbar = () => {
	const { data: session, isPending } = useSession();
	const t = useTranslations("navigation");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const pathname = usePathname();
	const [showUserMenu, setShowUserMenu] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		setIsMobileMenuOpen(false);
		setShowUserMenu(false);
	}, [pathname]);

	const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
	const toggleMobileMenu = useCallback(
		() => setIsMobileMenuOpen((prev) => !prev),
		[],
	);

	const scrollToElement = useCallback(
		(id: string) => {
			const element = document.getElementById(id);
			if (element) {
				element.scrollIntoView({ behavior: "smooth", block: "start" });
				closeMobileMenu();
			}
		},
		[closeMobileMenu],
	);

	const scrollToFooter = useCallback(() => {
		const footerElement = document.querySelector("footer");
		if (footerElement) {
			footerElement.scrollIntoView({ behavior: "smooth", block: "start" });
			closeMobileMenu();
		}
	}, [closeMobileMenu]);

	const closeUserMenu = useCallback(() => setShowUserMenu(false), []);
	const toggleUserMenu = useCallback(
		() => setShowUserMenu((prev) => !prev),
		[],
	);
	const handleSignOut = useCallback(() => {
		signOut();
		closeUserMenu();
		closeMobileMenu();
	}, [closeMobileMenu, closeUserMenu]);

	const desktopAuthControls: ReactNode = useMemo(() => {
		if (isPending) {
			return (
				<div className="welcome-btn welcome-btn-secondary">
					{tCommon("loading")}
				</div>
			);
		}

		if (session) {
			return (
				<div className="relative">
					<button
						type="button"
						onClick={toggleUserMenu}
						className="welcome-btn welcome-btn-secondary flex items-center gap-2"
					>
						<User className="h-4 w-4" />
						{session.user.name || session.user.email}
						<ChevronDown className="h-4 w-4" />
					</button>

					{showUserMenu && (
						<div className="welcome-user-menu">
							<Link
								href={`/${locale}/dashboard`}
								className="welcome-user-menu-item"
								onClick={closeUserMenu}
							>
								<ChartLine className="h-4 w-4" />
								{t("dashboard")}
							</Link>
							<Link
								href={`/${locale}/dashboard/profile`}
								className="welcome-user-menu-item"
								onClick={closeUserMenu}
							>
								<User className="h-4 w-4" />
								{t("profile")}
							</Link>
							<Link
								href={`/${locale}/dashboard/settings`}
								className="welcome-user-menu-item"
								onClick={closeUserMenu}
							>
								<Settings className="h-4 w-4" />
								{t("settings")}
							</Link>
							<hr className="welcome-user-menu-divider" />
							<button
								type="button"
								onClick={handleSignOut}
								className="welcome-user-menu-item signout"
							>
								<LogOut className="h-4 w-4" />
								{t("logout")}
							</button>
						</div>
					)}
				</div>
			);
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
	}, [closeUserMenu, handleSignOut, isPending, locale, session, showUserMenu, t, tCommon, toggleUserMenu]);

	const mobileAuthControls: ReactNode = useMemo(() => {
		if (isPending) {
			return <div className="welcome-mobile-auth-note">{tCommon("loading")}</div>;
		}

		if (session) {
			return (
				<div className="welcome-mobile-auth">
					<div className="welcome-mobile-user">
						<User className="h-4 w-4" />
						<span>{session.user.name || session.user.email}</span>
					</div>
					<Link href={`/${locale}/dashboard`} onClick={closeMobileMenu} className="welcome-mobile-link">
						{t("dashboard")}
					</Link>
					<Link href={`/${locale}/dashboard/profile`} onClick={closeMobileMenu} className="welcome-mobile-link">
						{t("profile")}
					</Link>
					<Link href={`/${locale}/dashboard/settings`} onClick={closeMobileMenu} className="welcome-mobile-link">
						{t("settings")}
					</Link>
					<button type="button" onClick={handleSignOut} className="welcome-mobile-link signout">
						{t("logout")}
					</button>
				</div>
			);
		}

		return (
			<div className="welcome-mobile-auth-buttons">
				<Link href={`/${locale}/signin`} onClick={closeMobileMenu} className="welcome-btn welcome-btn-secondary">
					{t("login")}
				</Link>
				<Link href={`/${locale}/signup`} onClick={closeMobileMenu} className="welcome-btn welcome-btn-primary">
					{t("signup")}
				</Link>
			</div>
		);
	}, [closeMobileMenu, handleSignOut, isPending, locale, session, t, tCommon]);

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

	return (
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
						<button type="button" onClick={() => scrollToElement("features")}
							className="welcome-nav-link">
							{t("features")}
						</button>
						<button type="button" onClick={() => scrollToElement("tech")}
							className="welcome-nav-link">
							{t("technology")}
						</button>
						<button type="button" onClick={scrollToFooter} className="welcome-nav-link">
							{t("contact", { default: "" }) || "יצירת קשר"}
						</button>
						<LanguageSwitcher onLocaleChange={closeMobileMenu} />
						{desktopAuthControls}
					</div>
					<button
						type="button"
						className="welcome-mobile-toggle"
						onClick={toggleMobileMenu}
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
					<LanguageSwitcher variant="mobile" onLocaleChange={closeMobileMenu} />
					{mobileAuthControls}
				</div>
			)}
		</nav>
	);
};

export default Navbar;
