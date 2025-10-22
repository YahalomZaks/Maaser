"use client";

import clsx from "clsx";
import { Languages, Check } from "lucide-react";
import Image from "next/image";
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

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
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
  const closeTimer = useRef<number | null>(null);

  const languages = useMemo(
    () => [
      {
        code: "he" as SupportedLanguage,
        label: t("hebrew"),
        emoji: "🇮🇱",
        flagSrc: "/flags/il.svg",
      },
      {
        code: "en" as SupportedLanguage,
        label: t("english"),
        emoji: "🇺🇸",
        flagSrc: "/flags/us.svg",
      },
    ],
    [t],
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

  // Mobile: use shadcn Select popover for accessible, native-feel selection
  if (variant === "mobile") {
    const current = languages.find((l) => l.code === (locale as SupportedLanguage));
    const dir = (locale?.toLowerCase().startsWith("he") ? "rtl" : "ltr") as "rtl" | "ltr";
    return (
      <Select
        defaultValue={locale as SupportedLanguage}
        onValueChange={(val) => handleLanguageChange(val as SupportedLanguage)}
        dir={dir}
      >
        <SelectTrigger className={clsx("welcome-language-mobile-trigger", className)} aria-label={t("changeLabel")} dir={dir}>
          <span className="welcome-language-trigger-left">
            <span className="welcome-language-trigger-title">{t("changeLabel")}</span>
            <span className="welcome-language-trigger-current">
              {current ? (
                <>
                  <span className="welcome-language-flag" aria-hidden>
                    <Image src={current.flagSrc} alt="" width={18} height={12} style={{ width: "auto", height: "auto" }} />
                  </span>
                  <span className="welcome-language-current-label">{current.label}</span>
                </>
              ) : null}
            </span>
          </span>
        </SelectTrigger>
        <SelectContent position="popper" dir={dir}>
          {languages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              <span className="inline-flex items-center gap-2">
                <Image src={language.flagSrc} alt="" width={18} height={12} style={{ width: "auto", height: "auto" }} />
                <span>{language.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

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
      onMouseEnter={() => {
        if (closeTimer.current) {
          window.clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
        setIsOpen(true);
      }}
      onMouseLeave={() => {
        // small delay to prevent accidental close when moving to dropdown
        closeTimer.current = window.setTimeout(() => setIsOpen(false), 120);
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={clsx("welcome-language-selector-desktop", {
          pending: isPending,
        })}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("changeLabel")}
      >
        <Languages size={18} />
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
                <Image src={language.flagSrc} alt="" width={18} height={12} style={{ width: "auto", height: "auto" }} />
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
