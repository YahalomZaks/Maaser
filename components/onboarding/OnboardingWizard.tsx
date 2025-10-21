"use client";

import { ArrowLeft, ArrowRight, Building2, CalendarDays, Check, Coins, Gauge, Globe2, HandCoins, Plus, Sparkles, Trash2, TrendingUp, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CurrencyCode, DonationType } from "@/types/finance";

const FEATURE_KEYS = ["track", "calculate", "organize", "notifications"] as const;

interface FormState {
  language: string;
  currency: CurrencyCode;
  tithePercent: number;
}

interface DonationDraft {
  organization: string;
  amount: string;
  currency: CurrencyCode;
  type: DonationType;
  installmentsRemaining: string;
}

const STEP_ORDER = ["welcome", "explainDashboard", "explainIncome", "explainDonations", "setupIncome", "setupDonations"] as const;

type StepKey = (typeof STEP_ORDER)[number];

const BRAND_ICONS = [
  { Icon: Globe2, label: "Global reach" },
  { Icon: Building2, label: "Workspace" },
];

const INSTALLMENT_OPTIONS = Array.from({ length: 36 }, (_, index) => String(index + 1));

export function OnboardingWizard() {
  const locale = useLocale();
  const isRTL = locale === "he";
  const router = useRouter();
  const t = useTranslations("firstTimeSetup");
  const tCommon = useTranslations("common");
  const tIncome = useTranslations("income.settings");
  const tDashboardCurrency = useTranslations("dashboard.baseCurrency.labels");
  const tDonationTypes = useTranslations("donations.types");
  const tDonationsForm = useTranslations("donations.form");

  const defaultCurrency: CurrencyCode = locale === "en" ? "USD" : "ILS";

  const [step, setStep] = useState<StepKey>(STEP_ORDER[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    language: locale.toUpperCase(),
    currency: defaultCurrency,
    tithePercent: 10,
  });
  const [donations, setDonations] = useState<DonationDraft[]>([]);
  const [donationDraft, setDonationDraft] = useState<DonationDraft>({
    organization: "",
    amount: "",
    currency: defaultCurrency,
    type: "recurring",
    installmentsRemaining: "6",
  });

  useEffect(() => {
    setDonationDraft((prev) => ({ ...prev, currency: form.currency }));
  }, [form.currency]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const totalSteps = STEP_ORDER.length;

  const stepDetails = useMemo(
    () => ({
      welcome: {
        label: t("welcome.title"),
        description: t("welcome.subtitle"),
      },
      explainDashboard: {
        label: t("explainDashboard.title"),
        description: t("explainDashboard.subtitle"),
      },
      explainIncome: {
        label: t("explainIncome.title"),
        description: t("explainIncome.subtitle"),
      },
      explainDonations: {
        label: t("explainDonations.title"),
        description: t("explainDonations.subtitle"),
      },
      setupIncome: {
        label: t("setupIncome.title"),
        description: t("setupIncome.subtitle"),
      },
      setupDonations: {
        label: t("setupDonations.title"),
        description: t("setupDonations.subtitle"),
      },
    }),
    [t],
  );

  const nextLabel = stepIndex === totalSteps - 1 ? t("navigation.finish") : t("navigation.next");

  const handlePrevious = useCallback(() => {
    if (stepIndex === 0) {
      return;
    }
    setStep(STEP_ORDER[stepIndex - 1]);
  }, [stepIndex]);

  const handleNext = useCallback(() => {
    if (stepIndex < totalSteps - 1) {
      setStep(STEP_ORDER[stepIndex + 1]);
    }
  }, [stepIndex, totalSteps]);

  const handleChange = useCallback(<T extends keyof FormState>(field: T, value: FormState[T]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleDonationDraftChange = useCallback(
    <T extends keyof DonationDraft>(field: T, value: DonationDraft[T]) => {
      setDonationDraft((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const handleAddDonation = useCallback(() => {
    if (!donationDraft.organization.trim()) {
      toast.error(tDonationsForm("errors.organizationRequired"));
      return;
    }
    if (Number(donationDraft.amount) <= 0) {
      toast.error(tDonationsForm("errors.amountPositive"));
      return;
    }
    if (donationDraft.type === "installments" && Number(donationDraft.installmentsRemaining) <= 0) {
      toast.error(tDonationsForm("errors.installmentsRequired"));
      return;
    }
    setDonations((prev) => [...prev, { ...donationDraft }]);
    setDonationDraft((prev) => ({
      ...prev,
      organization: "",
      amount: "",
      installmentsRemaining: prev.installmentsRemaining || "6",
    }));
    toast.success(tDonationsForm("success"));
  }, [donationDraft, tDonationsForm]);

  const handleRemoveDonation = useCallback((index: number) => {
    setDonations((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const submitOnboarding = useCallback(
    async (skip: boolean) => {
      setIsSubmitting(true);
      try {
        const donationPayload = skip
          ? []
          : donations
            .filter((donation) => donation.organization.trim())
            .map((donation) => ({
              organization: donation.organization.trim(),
              amount: Number(donation.amount) || 0,
              currency: donation.currency,
              type: donation.type,
              startDate: new Date().toISOString().slice(0, 10),
              installmentsTotal:
                donation.type === "installments"
                  ? (() => {
                    const remaining = Number(donation.installmentsRemaining) || 0;
                    return remaining > 0 ? remaining : null;
                  })()
                  : null,
              installmentsPaid: donation.type === "installments" ? 0 : null,
            }));

        const payload = skip
          ? {}
          : {
            language: form.language,
            currency: form.currency,
            tithePercent: Number.isFinite(Number(form.tithePercent)) ? Number(form.tithePercent) : 10,
            donations: donationPayload,
          };

        const response = await fetch("/api/onboarding", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to complete onboarding: ${response.status}`);
        }

        toast.success(t("summary.ready"));
        router.push(`/${locale}/dashboard`);
        router.refresh();
      } catch (error) {
        console.error("Onboarding submission failed", error);
        toast.error(tCommon("error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [donations, form, locale, router, t, tCommon],
  );

  const currencyOptions = useMemo(
    () => [
      { value: "ILS", label: tDashboardCurrency("ils") },
      { value: "USD", label: tDashboardCurrency("usd") },
    ],
    [tDashboardCurrency],
  );

  const donationTypeOptions = useMemo(
    () => [
      { value: "recurring" as DonationType, label: tDonationTypes("recurring") },
      { value: "oneTime" as DonationType, label: tDonationTypes("oneTime") },
      { value: "installments" as DonationType, label: tDonationTypes("limited") ?? tDonationTypes("installments") },
    ],
    [tDonationTypes],
  );

  const canAddDonation = useMemo(() => {
    if (donationDraft.organization.trim().length === 0) {
      return false;
    }
    if (!(Number(donationDraft.amount) > 0)) {
      return false;
    }
    if (donationDraft.type === "installments") {
      return Number(donationDraft.installmentsRemaining) > 0;
    }
    return true;
  }, [donationDraft.amount, donationDraft.installmentsRemaining, donationDraft.organization, donationDraft.type]);

  const stepLabels = useMemo(() => [
    t("steps.welcome") || "ברוך הבא",
    t("steps.explainDashboard") || "לוח בקרה",
    t("steps.explainIncome") || "עמוד הכנסות",
    t("steps.explainDonations") || "עמוד תרומות",
    t("steps.setupIncome") || "הוספת הכנסות",
    t("steps.setupDonations") || "הוספת תרומות"
  ], [t]);

  return (
    <div className="relative w-full">

      {/* Main Container */}
      <div className="relative w-full">
        <div className="mx-auto w-full max-w-full px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-3 md:py-4 flex flex-col pb-28 md:pb-32">

          {/* Header with Logo */}
          <div className="mb-4 md:mb-5">
            <div className="flex items-center justify-center text-center">
              {/* Logo */}
              <div className="flex items-center gap-2 md:gap-3">
                {BRAND_ICONS.slice(0, 2).map(({ Icon }, index) => (
                  <div key={index} className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                ))}
                <div className="text-center">
                  <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">
                    {locale === "he" ? "מעשרותִי" : "Maasroti"}
                  </h1>
                  <p className="text-xs md:text-sm text-slate-500">{t("welcome.badge")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Steps - Desktop */}

          <div className="hidden md:block mb-8">
            <div className="relative" dir={isRTL ? 'rtl' : 'ltr'}> {/* הוסף dir אם לא קיים גלובלית */}
              {/* Progress Line Background */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200" />
              {/* Progress Line Filled (RTL-aware) */}
              <div
                className="absolute top-5 h-0.5 bg-blue-500 transition-all duration-500"
                style={{
                  width: `${(stepIndex / (totalSteps - 1)) * 100}%`,
                  ...(isRTL ? { right: 0 } : { left: 0 }),
                }}
              />

              {/* Steps (logical order always, CSS + dir handles visual RTL reversal) */}
              <div className="relative flex justify-between">
                {STEP_ORDER.map((key, actualIndex) => {
                  const isActive = key === step;
                  const isComplete = stepIndex > actualIndex;
                  const stepNumber = actualIndex + 1;
                  const stepLabel = stepLabels[actualIndex]; // התאמה ללוגיקה
                  return (
                    <div key={key} className="flex flex-col items-center flex-1 min-w-0"> {/* flex-1 לשוויון */}
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full font-semibold text-sm transition-all duration-300 mb-2",
                          isActive && "bg-blue-500 text-white shadow-lg scale-110 ring-4 ring-blue-100",
                          isComplete && "bg-green-500 text-white",
                          !isActive && !isComplete && "bg-white border-2 border-slate-200 text-slate-400"
                        )}
                      >
                        {isComplete ? <Check className="h-5 w-5" /> : stepNumber}
                      </div>
                      <p className={cn(
                        "text-xs text-center font-medium transition-colors px-1", // px-1 למניעת overflow
                        isActive && "text-blue-600",
                        isComplete && "text-slate-600",
                        !isActive && !isComplete && "text-slate-400"
                      )}>
                        {stepLabel}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>


          {/* Progress Steps - Mobile */}
          <div className="md:hidden mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">
                    שלב {stepIndex + 1} מתוך {totalSteps}
                  </span>
                  <span className="text-xs text-slate-500">
                    {Math.round(((stepIndex + 1) / totalSteps) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
              {/* Current Step Label */}
              <p className="text-sm text-slate-600 text-center font-medium">
                {stepLabels[stepIndex]}
              </p>
            </div>
          </div>

          {/* Content Area */}
          <div className="relative">
            {step === "welcome" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Hero Section */}
                <div className="mb-6 md:mb-8 text-center">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 md:mb-4">
                    {stepDetails[step].label}
                  </h2>
                  <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4">
                    {stepDetails[step].description}
                  </p>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-xl md:rounded-2xl shadow-md border border-slate-200 p-5 md:p-8 mb-4 md:mb-6">
                  <p className="text-slate-700 text-center mb-6 md:mb-8 text-sm md:text-base">{t("welcome.description")}</p>

                  {/* Feature Grid */}
                  <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {FEATURE_KEYS.map((key, index) => (
                      <div
                        key={key}
                        className="relative overflow-hidden rounded-lg md:rounded-xl bg-slate-50/80 p-4 md:p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                            <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800 text-sm md:text-base">{t(`welcome.features.${key}`)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Note */}
                <div className="rounded-lg md:rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-3 md:p-4 text-center">
                  <p className="text-xs md:text-sm text-slate-600">{t("welcome.note")}</p>
                </div>
              </div>
            )}

            {step === "explainDashboard" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Hero Section with Icon */}
                <div className="mb-6 md:mb-8 text-center">
                  <div className="inline-flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-xl md:rounded-2xl bg-blue-500 text-white shadow-lg mb-3 md:mb-4">
                    <Gauge className="h-8 w-8 md:h-10 md:w-10" />
                  </div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 md:mb-4">
                    {stepDetails[step].label}
                  </h2>
                  <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4">
                    {stepDetails[step].description}
                  </p>
                </div>

                {/* Description Card */}
                <div className="bg-white rounded-xl md:rounded-2xl shadow-md border border-slate-200 p-5 md:p-8 mb-4 md:mb-6">
                  <p className="text-slate-700 text-center mb-6 md:mb-8 text-sm md:text-base">{t("explainDashboard.description")}</p>

                  {/* Features Grid */}
                  <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg md:rounded-xl bg-slate-50/80 p-4 md:p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-3 mb-2 md:mb-3">
                        <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
                          <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm md:text-base">{t("explainDashboard.features.overview.title")}</h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-600">{t("explainDashboard.features.overview.description")}</p>
                    </div>

                    <div className="rounded-lg md:rounded-xl bg-slate-50/80 p-4 md:p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-3 mb-2 md:mb-3">
                        <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
                          <Wallet className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm md:text-base">{t("explainDashboard.features.balance.title")}</h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-600">{t("explainDashboard.features.balance.description")}</p>
                    </div>

                    <div className="rounded-lg md:rounded-xl bg-slate-50/80 p-4 md:p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-3 mb-2 md:mb-3">
                        <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
                          <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm md:text-base">{t("explainDashboard.features.monthly.title")}</h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-600">{t("explainDashboard.features.monthly.description")}</p>
                    </div>

                    <div className="rounded-lg md:rounded-xl bg-slate-50/80 p-4 md:p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-3 mb-2 md:mb-3">
                        <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
                          <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm md:text-base">{t("explainDashboard.features.progress.title")}</h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-600">{t("explainDashboard.features.progress.description")}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "explainIncome" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Hero Section with Icon */}
                <div className="mb-6 md:mb-8 text-center">
                  <div className="inline-flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-xl md:rounded-2xl bg-blue-500 text-white shadow-lg mb-3 md:mb-4">
                    <Coins className="h-8 w-8 md:h-10 md:w-10" />
                  </div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 md:mb-4">
                    {stepDetails[step].label}
                  </h2>
                  <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4">
                    {stepDetails[step].description}
                  </p>
                </div>

                {/* Description Card */}
                <div className="bg-white rounded-xl md:rounded-2xl shadow-md border border-slate-200 p-5 md:p-8 mb-4 md:mb-6 max-w-4xl mx-auto">
                  <p className="text-slate-700 text-center mb-6 md:mb-8 text-sm md:text-base">{t("explainIncome.description")}</p>

                  {/* Steps List */}
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex gap-3 md:gap-4 p-4 md:p-5 rounded-lg md:rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-base md:text-lg">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 mb-1 text-sm md:text-base">{t("explainIncome.features.sources.title")}</h4>
                        <p className="text-xs md:text-sm text-slate-600">{t("explainIncome.features.sources.description")}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 md:gap-4 p-4 md:p-5 rounded-lg md:rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-base md:text-lg">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 mb-1 text-sm md:text-base">{t("explainIncome.features.types.title")}</h4>
                        <p className="text-xs md:text-sm text-slate-600">{t("explainIncome.features.types.description")}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 md:gap-4 p-4 md:p-5 rounded-lg md:rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-base md:text-lg">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 mb-1 text-sm md:text-base">{t("explainIncome.features.tracking.title")}</h4>
                        <p className="text-xs md:text-sm text-slate-600">{t("explainIncome.features.tracking.description")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "explainDonations" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Hero Section with Icon */}
                <div className="mb-6 md:mb-8 text-center">
                  <div className="inline-flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-xl md:rounded-2xl bg-blue-500 text-white shadow-lg mb-3 md:mb-4">
                    <HandCoins className="h-8 w-8 md:h-10 md:w-10" />
                  </div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 md:mb-4">
                    {stepDetails[step].label}
                  </h2>
                  <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4">
                    {stepDetails[step].description}
                  </p>
                </div>

                {/* Description Card */}
                <div className="bg-white rounded-xl md:rounded-2xl shadow-md border border-slate-200 p-5 md:p-8 mb-4 md:mb-6 max-w-4xl mx-auto">
                  <p className="text-slate-700 text-center mb-6 md:mb-8 text-sm md:text-base">{t("explainDonations.description")}</p>

                  {/* Steps List */}
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex gap-3 md:gap-4 p-4 md:p-5 rounded-lg md:rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-base md:text-lg">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 mb-1 text-sm md:text-base">{t("explainDonations.features.recurring.title")}</h4>
                        <p className="text-xs md:text-sm text-slate-600">{t("explainDonations.features.recurring.description")}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 md:gap-4 p-4 md:p-5 rounded-lg md:rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-base md:text-lg">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 mb-1 text-sm md:text-base">{t("explainDonations.features.installments.title")}</h4>
                        <p className="text-xs md:text-sm text-slate-600">{t("explainDonations.features.installments.description")}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 md:gap-4 p-4 md:p-5 rounded-lg md:rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                      <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-base md:text-lg">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 mb-1 text-sm md:text-base">{t("explainDonations.features.oneTime.title")}</h4>
                        <p className="text-xs md:text-sm text-slate-600">{t("explainDonations.features.oneTime.description")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "setupIncome" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6 md:mb-8 text-center">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 md:mb-4">
                    {stepDetails[step].label}
                  </h2>
                  <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4">
                    {stepDetails[step].description}
                  </p>
                </div>

                <div className="grid gap-4 md:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="bg-white rounded-xl md:rounded-2xl shadow-md border border-slate-200 p-5 md:p-8 space-y-5 md:space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-slate-700 font-semibold">{tIncome("baseCurrency")}</Label>
                      <Select value={form.currency} onValueChange={(value) => handleChange("currency", value as CurrencyCode)}>
                        <SelectTrigger
                          id="currency"
                          className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tithePercent" className="text-slate-700 font-semibold">{tIncome("tithePercentLabel")}</Label>
                      <Input
                        id="tithePercent"
                        type="number"
                        min={1}
                        max={50}
                        value={form.tithePercent}
                        onChange={(event) => handleChange("tithePercent", Number(event.target.value) || 0)}
                        className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                      <p className="text-xs text-slate-500">{tIncome("tithePercentHelper")}</p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg md:text-xl font-semibold text-slate-800">
                        {t("setupIncome.guideTitle")}
                      </h3>
                      <ul className="space-y-4">
                        <li className="flex gap-3">
                          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Check className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{t("setupIncome.guide.recurring.title")}</p>
                            <p className="text-sm text-slate-600">{t("setupIncome.guide.recurring.body")}</p>
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{t("setupIncome.guide.limited.title")}</p>
                            <p className="text-sm text-slate-600">{t("setupIncome.guide.limited.body")}</p>
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{t("setupIncome.guide.oneTime.title")}</p>
                            <p className="text-sm text-slate-600">{t("setupIncome.guide.oneTime.body")}</p>
                          </div>
                        </li>
                      </ul>

                      <div className="flex flex-wrap items-center gap-3 pt-4">
                        <Button asChild>
                          <a href={`/${locale}/dashboard/income`} target="_blank" rel="noopener noreferrer">
                            {t("setupIncome.cta.manage")}
                          </a>
                        </Button>
                        <p className="text-xs text-slate-500">
                          {t("setupIncome.cta.helper")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500 rounded-xl md:rounded-2xl shadow-lg p-5 md:p-8 text-white">
                    <div className="space-y-4 md:space-y-6">
                      <div>
                        <p className="text-blue-100 text-xs md:text-sm font-medium mb-2">{t("setupIncome.panel.title")}</p>
                        <p className="text-lg md:text-xl text-blue-50 leading-relaxed">
                          {t("setupIncome.panel.description")}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <Gauge className="h-5 w-5 text-blue-100" />
                          <span className="text-sm font-medium text-blue-100">{t("setupIncome.panel.tipOne")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <HandCoins className="h-5 w-5 text-blue-100" />
                          <span className="text-sm font-medium text-blue-100">{t("setupIncome.panel.tipTwo")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "setupDonations" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Hero Section */}
                <div className="mb-6 md:mb-8 text-center">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 md:mb-4">
                    {stepDetails[step].label}
                  </h2>
                  <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4">
                    {stepDetails[step].description}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 md:p-5 mb-4 md:mb-6 text-blue-700 text-sm md:text-base">
                  {t("setupDonations.reminder")}
                </div>

                {/* Donation Form */}
                <div className="bg-white rounded-xl md:rounded-2xl shadow-md border border-slate-200 p-5 md:p-8 space-y-4 md:space-y-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{t("donations.title")}</h3>
                    <p className="text-sm text-slate-600">{t("donations.helper")}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="donationOrg" className="text-slate-700 font-semibold">{t("donations.organizationName")}</Label>
                      <Input
                        id="donationOrg"
                        value={donationDraft.organization}
                        onChange={(event) => handleDonationDraftChange("organization", event.target.value)}
                        placeholder={t("donations.organizationName")}
                        className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="donationAmount" className="text-slate-700 font-semibold">{t("donations.amount")}</Label>
                      <Input
                        id="donationAmount"
                        type="number"
                        min={0}
                        value={donationDraft.amount}
                        onChange={(event) => handleDonationDraftChange("amount", event.target.value)}
                        placeholder="0"
                        className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="donationCurrency" className="text-slate-700 font-semibold">{t("donations.currency")}</Label>
                      <Select value={donationDraft.currency} onValueChange={(value) => handleDonationDraftChange("currency", value as CurrencyCode)}>
                        <SelectTrigger
                          id="donationCurrency"
                          className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="donationType" className="text-slate-700 font-semibold">{t("donations.type")}</Label>
                      <Select value={donationDraft.type} onValueChange={(value) => handleDonationDraftChange("type", value as DonationType)}>
                        <SelectTrigger
                          id="donationType"
                          className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {donationTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {donationDraft.type === "installments" && (
                      <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label htmlFor="donationInstallments" className="text-slate-700 font-semibold">{t("donations.installmentsRemainingLabel")}</Label>
                        <Select value={donationDraft.installmentsRemaining} onValueChange={(value) => handleDonationDraftChange("installmentsRemaining", value)}>
                          <SelectTrigger
                            id="donationInstallments"
                            className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTALLMENT_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    disabled={!canAddDonation}
                    onClick={handleAddDonation}
                    className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    {t("donations.addButton")}
                  </Button>
                  {/* Donations List */}
                  <div className="space-y-3 md:space-y-4">
                    <h4 className="font-semibold text-slate-800 text-base md:text-lg">{t("donations.listTitle")}</h4>
                    {donations.length === 0 ? (
                      <div className="text-center py-6 md:py-8 rounded-lg md:rounded-xl bg-slate-50 border-2 border-dashed border-slate-200">
                        <HandCoins className="h-10 w-10 md:h-12 md:w-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs md:text-sm text-slate-500">{t("donations.empty")}</p>
                      </div>
                    ) : (
                      <ul className="space-y-2 md:space-y-3">
                        {donations.map((donation, index) => (
                          <li
                            key={`${donation.organization}-${index}`}
                            className="flex items-center justify-between rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4 hover:border-blue-400 hover:shadow-sm transition-all"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="font-semibold text-slate-800 text-sm md:text-base truncate">{donation.organization}</p>
                              <p className="text-xs md:text-sm text-slate-600 mt-1">
                                {new Intl.NumberFormat(locale, { style: "currency", currency: donation.currency }).format(Number(donation.amount) || 0)} · {tDonationTypes(donation.type)}
                              </p>
                              {donation.type === "installments" && Number(donation.installmentsRemaining) > 0 ? (
                                <p className="text-xs text-blue-600 mt-1">
                                  {t("donations.installmentsRemainingNote", { count: donation.installmentsRemaining })}
                                </p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveDonation(index)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                            >
                              <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg md:rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-3 md:p-4">
                    <p className="text-xs md:text-sm text-slate-600">{t("donations.note")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Footer (sticky) */}
          <div className="fixed inset-x-0 bottom-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-6px_12px_-6px_rgba(15,23,42,0.12)]">
            <div className="mx-auto w-full max-w-full px-3 md:px-6 py-3 md:py-4">
              <div className="flex items-center justify-between gap-3 md:gap-4">
                {/* Left Side Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={stepIndex === 0 || isSubmitting}
                    onClick={handlePrevious}
                    className="gap-2 hover:bg-slate-100 text-slate-600 text-base md:text-base px-3 md:px-4 h-12 md:h-11"
                  >
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    <span className="hidden sm:inline">{t("navigation.previous")}</span>
                  </Button>

                  {step !== "setupDonations" && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => submitOnboarding(true)}
                      isLoading={isSubmitting}
                      loadingText={tCommon("loading")}
                      className="gap-2 hover:bg-slate-100 text-slate-500 text-base md:text-base px-3 md:px-4 h-12 md:h-11"
                    >
                      {t("navigation.skip")}
                    </Button>
                  )}
                </div>

                {/* Right Side Button */}
                <div>
                  {step !== "setupDonations" ? (
                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleNext}
                      className="gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all min-w-[120px] md:min-w-[140px] text-base md:text-base h-12 md:h-11 px-5"
                    >
                      <span>{t("navigation.next")}</span>
                      <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => submitOnboarding(false)}
                      isLoading={isSubmitting}
                      loadingText={tCommon("loading")}
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all min-w-[150px] md:min-w-[180px] text-base md:text-base h-12 md:h-11 px-5"
                    >
                      <Check className="h-4 w-4 md:h-5 md:w-5" />
                      <span>{nextLabel}</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
