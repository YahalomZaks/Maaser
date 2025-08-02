import { Github, Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';

const Header = () => {
	const t = useTranslations('navigation');
	
	return (
		<header className="fixed top-0 w-full  border-b border-border z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center space-x-3">
						<span className="text-xl font-bold text-foreground">{t('appName')}</span>
					</div>

					<div className="flex items-center space-x-4">
						<LanguageSwitcher />
						<Link
							href="/signin"
							className="flex items-center space-x-2 px-4 py-2 hover:text-foreground transition-colors">
							<span>{t('login')}</span>
						</Link>
						<Link
							href="/signup" 
							className="flex items-center cursor-pointer space-x-2 bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors">
							<span className="text-sm font-medium text-primary-foreground">{t('signup')}</span>
						</Link>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Header;
