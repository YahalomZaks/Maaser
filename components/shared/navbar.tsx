"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useTranslations } from 'next-intl';
import { ChevronDown, User, Settings, LogOut, ChartLine } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from './LanguageSwitcher';

const Navbar = () => {
	const { data: session, isPending } = useSession();
	const t = useTranslations('navigation');
	const [showUserMenu, setShowUserMenu] = useState(false);

	const scrollToFeatures = () => {
		const featuresSection = document.getElementById('features');
		if (featuresSection) {
			featuresSection.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
		}
	};

	const scrollToTechStack = () => {
		const techSection = document.getElementById('tech');
		if (techSection) {
			techSection.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
		}
	};

	const scrollToFooter = () => {
		const footerElement = document.querySelector('footer');
		if (footerElement) {
			footerElement.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
		}
	};

	return (
		<nav className="welcome-navbar">
			<div className="welcome-nav-container">
				<div className="welcome-logo">
					<div className="welcome-logo-icon">
						<ChartLine className="h-6 w-6" />
					</div>
					<Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
						<span>מעשרות</span>
					</Link>
				</div>
				
				<div className="welcome-nav-links">
					<button 
						onClick={scrollToFeatures}
						className="welcome-nav-link"
						style={{ background: 'none', border: 'none', cursor: 'pointer' }}
					>
						{t('features')}
					</button>
					<button 
						onClick={scrollToTechStack}
						className="welcome-nav-link"
						style={{ background: 'none', border: 'none', cursor: 'pointer' }}
					>
						{t('technology')}
					</button>
					<button 
						onClick={scrollToFooter}
						className="welcome-nav-link"
						style={{ background: 'none', border: 'none', cursor: 'pointer' }}
					>
						יצירת קשר
					</button>
					
					<LanguageSwitcher />
					
					{isPending ? (
						<div className="welcome-btn welcome-btn-secondary">טוען...</div>
					) : session ? (
						<div className="relative">
							<button
								onClick={() => setShowUserMenu(!showUserMenu)}
								className="welcome-btn welcome-btn-secondary flex items-center gap-2"
							>
								<User className="h-4 w-4" />
								{session.user.name || session.user.email}
								<ChevronDown className="h-4 w-4" />
							</button>
							
							{showUserMenu && (
								<div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
									<Link
										href="/dashboard"
										className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
										onClick={() => setShowUserMenu(false)}
									>
										<ChartLine className="h-4 w-4" />
										{t('dashboard')}
									</Link>
									<Link
										href="/dashboard/profile"
										className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
										onClick={() => setShowUserMenu(false)}
									>
										<User className="h-4 w-4" />
										{t('profile')}
									</Link>
									<Link
										href="/dashboard/settings"
										className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
										onClick={() => setShowUserMenu(false)}
									>
										<Settings className="h-4 w-4" />
										{t('settings')}
									</Link>
									<hr className="border-gray-200" />
									<button
										onClick={() => {
											signOut();
											setShowUserMenu(false);
										}}
										className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
									>
										<LogOut className="h-4 w-4" />
										{t('logout')}
									</button>
								</div>
							)}
						</div>
					) : (
						<>
							<Link href="/signin" className="welcome-btn welcome-btn-secondary">
								{t('login')}
							</Link>
							<Link href="/signup" className="welcome-btn welcome-btn-primary">
								{t('signup')}
							</Link>
						</>
					)}
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
