"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Language } from "@prisma/client";
import { useSession } from "@/lib/auth-client";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const t = useTranslations('settings.language');
  const locale = useLocale();
  const { data: session } = useSession();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (newLanguage: Language) => {
    if (!session?.user || isChanging) return;

    setIsChanging(true);
    try {
      // Update user's language preference in database
      const response = await fetch('/api/settings/language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: newLanguage }),
      });

      if (response.ok) {
        // Reload the page to apply the new language
        window.location.reload();
      } else {
        console.error('Failed to update language preference');
      }
    } catch (error) {
      console.error('Error updating language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600">{t('title')}:</span>
      <div className="flex gap-1">
        <button
          onClick={() => handleLanguageChange(Language.HE)}
          disabled={isChanging}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            locale === 'he'
              ? 'bg-blue-100 text-blue-800 font-medium'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🇮🇱 עברית
        </button>
        <button
          onClick={() => handleLanguageChange(Language.EN)}
          disabled={isChanging}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            locale === 'en'
              ? 'bg-blue-100 text-blue-800 font-medium'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🇺🇸 English
        </button>
      </div>
    </div>
  );
}

/**
 * Compact language switcher for navbar
 */
export function CompactLanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale();
  const { data: session } = useSession();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async () => {
    if (!session?.user || isChanging) return;

    const newLanguage = locale === 'he' ? Language.EN : Language.HE;
    setIsChanging(true);

    try {
      const response = await fetch('/api/settings/language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: newLanguage }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        console.error('Failed to update language preference');
      }
    } catch (error) {
      console.error('Error updating language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <button
      onClick={handleLanguageChange}
      disabled={isChanging}
      className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${className} ${
        isChanging ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title={locale === 'he' ? 'Switch to English' : 'עבור לעברית'}
    >
      {locale === 'he' ? '🇺🇸' : '🇮🇱'}
    </button>
  );
}
