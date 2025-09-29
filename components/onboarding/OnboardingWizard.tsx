"use client";

import { Building2, Globe2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CurrencyCode, DonationType } from "@/types/finance";

const FEATURE_KEYS = ["track", "calculate", "organize", "notifications"] as const;

interface FormState {
  language: string;
  currency: CurrencyCode;
  tithePercent: number;
  personalIncome: string;
  spouseIncome: string;
  includeSpouseIncome: boolean;
}

interface DonationDraft {
  organization: string;
  amount: string;
  currency: CurrencyCode;
  type: DonationType;
}

const STEP_ORDER = ["welcome", "income", "summary"] as const;

type StepKey = (typeof STEP_ORDER)[number];

const BRAND_ICONS = [
  { Icon: Globe2, label: "Global reach" },
  { Icon: Building2, label: "Workspace" },
];

export function OnboardingWizard() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("firstTimeSetup");
  const tCommon = useTranslations("common");
  const tIncome = useTranslations("income.settings");
  const tDashboardCurrency = useTranslations("dashboard.baseCurrency.labels");
  const tDonationTypes = useTranslations("donations.types");

  const defaultCurrency: CurrencyCode = locale === "en" ? "USD" : "ILS";

  const [step, setStep] = useState<StepKey>(STEP_ORDER[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    language: locale.toUpperCase(),
    currency: defaultCurrency,
    tithePercent: 10,
    personalIncome: "",
    spouseIncome: "",
    includeSpouseIncome: false,
  });
  const [donations, setDonations] = useState<DonationDraft[]>([]);
  const [donationDraft, setDonationDraft] = useState<DonationDraft>({
    organization: "",
    amount: "",
    currency: defaultCurrency,
    type: "recurring",
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
      income: {
        label: t("income.title"),
        description: t("income.description"),
      },
      summary: {
        label: t("summary.title"),
        description: t("summary.description"),
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
      return;
    }
    if (Number(donationDraft.amount) <= 0) {
      return;
    }
    setDonations((prev) => [...prev, { ...donationDraft }]);
    setDonationDraft((prev) => ({ ...prev, organization: "", amount: "" }));
  }, [donationDraft]);

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
            }));

        const payload = skip
          ? {}
          : {
            language: form.language,
            currency: form.currency,
            tithePercent: Number.isFinite(Number(form.tithePercent)) ? Number(form.tithePercent) : 10,
            fixedIncome: {
              personal: Number(form.personalIncome) || 0,
              spouse: Number(form.spouseIncome) || 0,
              includeSpouse: Boolean(form.includeSpouseIncome),
            },
            donations: donationPayload,
          };

        const response = await fetch("/api/onboarding", {
          method: "POST",
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

  const totalFixedIncome = useMemo(() => {
    return (Number(form.personalIncome || 0) || 0) + (form.includeSpouseIncome ? Number(form.spouseIncome || 0) || 0 : 0);
  }, [form.includeSpouseIncome, form.personalIncome, form.spouseIncome]);

  const estimatedMaaser = useMemo(() => {
    return Math.round(totalFixedIncome * ((Number(form.tithePercent) || 0) / 100));
  }, [form.tithePercent, totalFixedIncome]);

  const canProceedFromIncome = useMemo(() => {
    if (!form.personalIncome) {
      return false;
    }
    if (form.includeSpouseIncome) {
      return form.spouseIncome.length > 0;
    }
    return true;
  }, [form.includeSpouseIncome, form.personalIncome, form.spouseIncome]);

  const canProceed = step === "income" ? canProceedFromIncome : true;
  const canAddDonation = donationDraft.organization.trim().length > 0 && Number(donationDraft.amount) > 0;

  return (
    <Card className="overflow-hidden border-none shadow-xl">
      <CardHeader className="relative space-y-4 bg-gradient-to-r from-primary to-primary/80 px-8 py-10 text-primary-foreground">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {BRAND_ICONS.map(({ Icon, label }, index) => (
                <span key={index} className="flex size-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                  <Icon aria-hidden className="size-6" />
                  <span className="sr-only">{label}</span>
                </span>
              ))}
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-white/80">
                <Sparkles className="size-4" />
                {t("welcome.badge")}
              </p>
              <CardTitle className="mt-1 text-3xl font-semibold text-white">
                {stepDetails[step].label}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {STEP_ORDER.map((key, index) => {
              const isActive = key === step;
              const isComplete = stepIndex > index;
              return (
                <div
                  key={key}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border border-white/40 text-sm font-semibold transition",
                    isActive && "bg-white text-primary",
                    !isActive && !isComplete && "bg-white/10 text-white/70",
                    isComplete && "bg-white/30 text-white",
                  )}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>
        </div>
        <p className="relative max-w-2xl text-sm text-white/90">{stepDetails[step].description}</p>
      </CardHeader>
      <CardContent className="space-y-8 bg-gradient-to-b from-white via-white to-muted/40 px-8 py-10">
        {step === "welcome" && (
          <div className="grid gap-6">
            <div className="rounded-2xl border border-primary/10 bg-white/80 p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">{t("welcome.description")}</p>
            </div>
            <ul className="grid gap-4 md:grid-cols-2">
              {FEATURE_KEYS.map((key) => (
                <li
                  key={key}
                  className="rounded-xl border border-border/60 bg-white/90 p-4 shadow-xs"
                >
                  <p className="text-base font-semibold text-foreground">{t(`welcome.features.${key}`)}</p>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
              {t("welcome.note")}
            </div>
          </div>
        )}

        {step === "income" && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="currency">{tIncome("baseCurrency")}</Label>
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(event) => handleChange("currency", event.target.value as CurrencyCode)}
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm shadow-sm"
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tithePercent">{tIncome("tithePercentLabel")}</Label>
                <Input
                  id="tithePercent"
                  type="number"
                  min={1}
                  max={50}
                  value={form.tithePercent}
                  onChange={(event) => handleChange("tithePercent", Number(event.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">{tIncome("tithePercentHelper")}</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="personalIncome">{t("income.yourIncome")}</Label>
                <Input
                  id="personalIncome"
                  type="number"
                  min={0}
                  value={form.personalIncome}
                  onChange={(event) => handleChange("personalIncome", event.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
                <input
                  id="includeSpouse"
                  type="checkbox"
                  checked={form.includeSpouseIncome}
                  onChange={(event) => handleChange("includeSpouseIncome", event.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <Label htmlFor="includeSpouse" className="font-normal">
                  {t("income.hasSpouse")}
                </Label>
              </div>

              {form.includeSpouseIncome && (
                <div className="grid gap-2">
                  <Label htmlFor="spouseIncome">{t("income.spouseIncome")}</Label>
                  <Input
                    id="spouseIncome"
                    type="number"
                    min={0}
                    value={form.spouseIncome}
                    onChange={(event) => handleChange("spouseIncome", event.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
            <div className="space-y-4 rounded-2xl border border-primary/10 bg-white/90 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">{t("summary.monthlyIncome")}</h3>
              <p className="text-3xl font-bold text-primary">
                {new Intl.NumberFormat(locale, { style: "currency", currency: form.currency }).format(totalFixedIncome || 0)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("summary.maaserAmount")}: {new Intl.NumberFormat(locale, { style: "currency", currency: form.currency }).format(estimatedMaaser || 0)}
              </p>
            </div>
          </div>
        )}

        {step === "summary" && (
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-muted-foreground">{t("summary.monthlyIncome")}</h3>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat(locale, { style: "currency", currency: form.currency }).format(totalFixedIncome || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-muted-foreground">{t("summary.maaserAmount")}</h3>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat(locale, { style: "currency", currency: form.currency }).format(estimatedMaaser || 0)}
                </p>
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">{t("donations.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("donations.helper")}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="donationOrg">{t("donations.organizationName")}</Label>
                  <Input
                    id="donationOrg"
                    value={donationDraft.organization}
                    onChange={(event) => handleDonationDraftChange("organization", event.target.value)}
                    placeholder={t("donations.organizationName")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="donationAmount">{t("donations.amount")}</Label>
                  <Input
                    id="donationAmount"
                    type="number"
                    min={0}
                    value={donationDraft.amount}
                    onChange={(event) => handleDonationDraftChange("amount", event.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="donationCurrency">{t("donations.currency")}</Label>
                  <select
                    id="donationCurrency"
                    value={donationDraft.currency}
                    onChange={(event) => handleDonationDraftChange("currency", event.target.value as CurrencyCode)}
                    className="rounded-md border border-border bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="donationType">{t("donations.type")}</Label>
                  <select
                    id="donationType"
                    value={donationDraft.type}
                    onChange={(event) => handleDonationDraftChange("type", event.target.value as DonationType)}
                    className="rounded-md border border-border bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    {donationTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!canAddDonation}
                onClick={handleAddDonation}
                className="inline-flex items-center gap-2"
              >
                <Plus className="size-4" />
                {t("donations.addButton")}
              </Button>
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">{t("donations.listTitle")}</h4>
                {donations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("donations.empty")}</p>
                ) : (
                  <ul className="space-y-3">
                    {donations.map((donation, index) => (
                      <li
                        key={`${donation.organization}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-foreground">{donation.organization}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Intl.NumberFormat(locale, { style: "currency", currency: donation.currency }).format(Number(donation.amount) || 0)} · {tDonationTypes(donation.type)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDonation(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
                {t("donations.note")}
              </div>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-white p-6 text-sm text-muted-foreground shadow-sm">
              <p>{t("summary.note")}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t border-border/60 bg-white px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={stepIndex === 0 || isSubmitting}
            onClick={handlePrevious}
          >
            {t("navigation.previous")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => submitOnboarding(true)}
          >
            {t("navigation.skip")}
          </Button>
        </div>
        <div className="flex gap-2">
          {step !== "summary" && (
            <Button type="button" disabled={!canProceed || isSubmitting} onClick={handleNext}>
              {t("navigation.next")}
            </Button>
          )}
          {step === "summary" && (
            <Button
              type="button"
              className="min-w-[160px]"
              disabled={isSubmitting}
              onClick={() => submitOnboarding(false)}
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
