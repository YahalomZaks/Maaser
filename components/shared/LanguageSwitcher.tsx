"use client";

import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { useSession } from "@/lib/auth-client";

type SupportedLanguage = "he" | "en";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "desktop" | "mobile";
  onLocaleChange?: () => void;
}

export function LanguageSwitcher({
  className = "",
  variant = "desktop",
  onLocaleChange,
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("settings.language");
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const languages = useMemo(
    () => [
      { code: "he" as SupportedLanguage, label: t("hebrew"), flag: "🇮🇱" },
      { code: "en" as SupportedLanguage, label: t("english"), flag: "🇺🇸" },
    ],
    [t],
  );

  const activeLanguage = useMemo(
    () => languages.find((language) => language.code === locale) ?? languages[0],
    [languages, locale],
  );

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const buildLocalizedPath = useCallback(
    (nextLocale: SupportedLanguage) => {
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length === 0) {
        segments.push(nextLocale);
      } else if (languages.some((language) => language.code === segments[0])) {
        segments[0] = nextLocale;
      } else {
        segments.unshift(nextLocale);
      }
      const search = searchParams.toString();
      return `/${segments.join("/")}${search ? `?${search}` : ""}`;
    },
    [languages, pathname, searchParams],
  );

  const handleLanguageChange = useCallback(
    (nextLocale: SupportedLanguage) => {
      if (isPending || locale === nextLocale) {
        closeDropdown();
        onLocaleChange?.();
        return;
      }

      const targetPath = buildLocalizedPath(nextLocale);

      startTransition(() => {
        router.push(targetPath);
        router.refresh();
      });

      closeDropdown();
      onLocaleChange?.();

      if (session?.user) {
        fetch("/api/settings/language", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ language: nextLocale.toUpperCase() }),
        }).catch((error) => {
          console.error("Failed to persist language preference", error);
        });
      }
    },
    [
      buildLocalizedPath,
      closeDropdown,
      isPending,
      locale,
      onLocaleChange,
      router,
      session?.user,
      startTransition,
    ],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handler = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeDropdown, isOpen]);

  useEffect(() => {
    closeDropdown();
  }, [closeDropdown, pathname]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        "welcome-language-wrapper",
        className,
        `welcome-language-${variant}`,
        {
          "is-open": isOpen,
          "is-pending": isPending,
        },
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={clsx("welcome-language-selector", {
          pending: isPending,
        })}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="welcome-language-flag" aria-hidden>
          {activeLanguage.flag}
        </span>
        <span className="welcome-language-label">{activeLanguage.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={clsx("welcome-language-arrow", {
            "is-open": isOpen,
          })}
        />
      </button>
      {isOpen && (
        <div className="welcome-language-dropdown" role="listbox">
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => handleLanguageChange(language.code)}
              className={clsx("welcome-language-option", {
                active: locale === language.code,
              })}
              role="option"
              aria-selected={locale === language.code}
            >
              <span className="welcome-language-option-flag" aria-hidden>
                {language.flag}
              </span>
              <span className="welcome-language-option-label">
                {language.label}
              </span>
              {locale === language.code && (
                <Check className="welcome-language-option-check" size={14} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
