"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FEATURE_KEYS = ["track", "calculate", "organize", "notifications"] as const;

interface FormState {
  language: string;
  currency: "ILS" | "USD";
  tithePercent: number;
  personalIncome: string;
  spouseIncome: string;
  includeSpouseIncome: boolean;
}

const STEP_ORDER = ["welcome", "income", "summary"] as const;

type StepKey = (typeof STEP_ORDER)[number];

export function OnboardingWizard() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("firstTimeSetup");
  const tCommon = useTranslations("common");
  const tIncome = useTranslations("income.settings");
  const tDashboardCurrency = useTranslations("dashboard.baseCurrency.labels");

  const [step, setStep] = useState<StepKey>(STEP_ORDER[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    language: locale.toUpperCase(),
    currency: locale === "en" ? "USD" : "ILS",
    tithePercent: 10,
    personalIncome: "",
    spouseIncome: "",
    includeSpouseIncome: false,
  });

  const stepIndex = STEP_ORDER.indexOf(step);
  const totalSteps = STEP_ORDER.length;

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

  const submitOnboarding = useCallback(
    async (skip: boolean) => {
      setIsSubmitting(true);
      try {
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
    [form, locale, router, t, tCommon],
  );

  const currencyOptions = useMemo(
    () => [
      { value: "ILS", label: tDashboardCurrency("ils") },
      { value: "USD", label: tDashboardCurrency("usd") },
    ],
    [tDashboardCurrency],
  );

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

  return (
    <Card className="overflow-hidden shadow-lg">
      <CardHeader className="space-y-2">
        <div className="text-sm text-muted-foreground">
          {tCommon("info")} · {stepIndex + 1}/{totalSteps}
        </div>
        <CardTitle>{t(`${step}.title`)}</CardTitle>
        {step !== "summary" ? (
          <p className="text-muted-foreground">{t(`${step}.description`)}</p>
        ) : (
          <p className="text-muted-foreground">{t("summary.ready")}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {step === "welcome" && (
          <div className="space-y-4">
            <p>{t("welcome.description")}</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {FEATURE_KEYS.map((key) => (
                <li
                  key={key}
                  className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm"
                >
                  {t(`welcome.features.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === "income" && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currency">{tIncome("baseCurrency")}</Label>
              <select
                id="currency"
                value={form.currency}
                onChange={(event) => handleChange("currency", event.target.value as FormState["currency"])}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
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

            <div className="flex items-center gap-2">
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
        )}

        {step === "summary" && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <h3 className="font-semibold">{t("summary.monthlyIncome")}</h3>
              <p className="text-muted-foreground">
                {Number(form.personalIncome || 0) + (form.includeSpouseIncome ? Number(form.spouseIncome || 0) : 0)}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <h3 className="font-semibold">{t("summary.maaserAmount")}</h3>
              <p className="text-muted-foreground">{form.tithePercent}%</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <h3 className="font-semibold">{t("donations.title")}</h3>
              <p className="text-muted-foreground">{t("donations.hasExisting")}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t border-border/60 bg-muted/20 p-6 sm:flex-row sm:items-center sm:justify-between">
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
            <Button
              type="button"
              disabled={!canProceed || isSubmitting}
              onClick={handleNext}
            >
              {t("navigation.next")}
            </Button>
          )}
          {step === "summary" && (
            <Button
              type="button"
              className="min-w-[140px]"
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
