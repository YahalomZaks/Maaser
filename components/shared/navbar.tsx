"use client";

import { ChartLine, ChevronDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

import { signOut, useSession } from "@/lib/auth-client";

import { LanguageSwitcher } from "./LanguageSwitcher";

const Navbar = () => {
	const { data: session, isPending } = useSession();
	const t = useTranslations('navigation');
	const locale = useLocale();
	const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return (
			<nav className="welcome-navbar" aria-hidden>
				<div className="welcome-nav-container" />
			</nav>
		);
	}

	const scrollToElement = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	const scrollToFooter = () => {
		const footerElement = document.querySelector('footer');
		if (footerElement) {
			footerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	const closeUserMenu = () => setShowUserMenu(false);
	const toggleUserMenu = () => setShowUserMenu((prev) => !prev);
	const handleSignOut = () => {
		signOut();
		closeUserMenu();
	};

	let authControls: ReactNode;

	if (isPending) {
		authControls = <div className="welcome-btn welcome-btn-secondary">טוען...</div>;
	} else if (session) {
		authControls = (
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
					<div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
						<Link
							href={`/${locale}/dashboard`}
							className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
							onClick={closeUserMenu}
						>
							<ChartLine className="h-4 w-4" />
							{t('dashboard')}
						</Link>
						<Link
							href={`/${locale}/dashboard/profile`}
							className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							onClick={closeUserMenu}
						>
							<User className="h-4 w-4" />
							{t('profile')}
						</Link>
						<Link
							href={`/${locale}/dashboard/settings`}
							className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							onClick={closeUserMenu}
						>
							<Settings className="h-4 w-4" />
							{t('settings')}
						</Link>
						<hr className="border-gray-200" />
						<button
							type="button"
							onClick={handleSignOut}
							className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
						>
							<LogOut className="h-4 w-4" />
							{t('logout')}
						</button>
					</div>
				)}
			</div>
		);
	} else {
		authControls = (
			<>
				<Link href={`/${locale}/signin`} className="welcome-btn welcome-btn-secondary">
					{t('login')}
				</Link>
				<Link href={`/${locale}/signup`} className="welcome-btn welcome-btn-primary">
					{t('signup')}
				</Link>
			</>
		);
	}

	return (
		<nav className="welcome-navbar">
			<div className="welcome-nav-container">
				<div className="welcome-logo">
					<div className="welcome-logo-icon">
						<ChartLine className="h-6 w-6" />
					</div>
					<Link href={`/${locale}`} style={{ textDecoration: 'none', color: 'inherit' }}>
						<span>מעשרות</span>
					</Link>
				</div>
				
				<div className="welcome-nav-links">
					<button 
						type="button"
						onClick={() => scrollToElement('features')}
						className="welcome-nav-link"
						style={{ background: 'none', border: 'none', cursor: 'pointer' }}
					>
						{t('features')}
					</button>
					<button 
						type="button"
						onClick={() => scrollToElement('tech')}
						className="welcome-nav-link"
						style={{ background: 'none', border: 'none', cursor: 'pointer' }}
					>
						{t('technology')}
					</button>
					<button 
						type="button"
						onClick={scrollToFooter}
						className="welcome-nav-link"
						style={{ background: 'none', border: 'none', cursor: 'pointer' }}
					>
						יצירת קשר
					</button>
					
					<LanguageSwitcher />
					{authControls}
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
