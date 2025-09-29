"use client";

import { AlertCircle, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";

interface PasswordValidity {
  checks: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
  score: number;
  isValid: boolean;
}

type PasswordCheck = keyof PasswordValidity["checks"];

const PASSWORD_CHECK_ORDER: PasswordCheck[] = [
  "length",
  "lowercase",
  "uppercase",
  "number",
  "special",
];

const validatePassword = (password: string): PasswordValidity => {
  const checks = {
    length: password.length >= 6,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  } satisfies PasswordValidity["checks"];

  const score = PASSWORD_CHECK_ORDER.reduce((count, key) => (checks[key] ? count + 1 : count), 0);
  return { checks, score, isValid: password.length > 0 && score >= 3 };
};

export function SignupForm() {
  const t = useTranslations("auth.signup");
  const locale = useLocale();
  const router = useRouter();
  const localePrefix = `/${locale}`;
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidity>(() => validatePassword(""));
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleInputChange = useCallback(
    (field: "name" | "email" | "password" | "confirmPassword", value: string) => {
      setFormError(null);
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (field === "password") {
        setPasswordValidation(validatePassword(value));
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (formData.password !== formData.confirmPassword) {
        const message = t("passwordRequirements.mismatch");
        toast.error(message, { icon: <AlertCircle className="h-4 w-4" /> });
        setFormError(message);
        return;
      }

      if (!passwordValidation.isValid) {
        const message = t("passwordRequirements.invalid");
        toast.error(message, { icon: <AlertCircle className="h-4 w-4" /> });
        setFormError(message);
        return;
      }

      const form = new FormData(event.currentTarget);
      const name = form.get("name") as string;
      const email = form.get("email") as string;
      const password = form.get("password") as string;

      startTransition(() => {
        setFormError(null);
        signUp.email(
          { name, email, password },
          {
            onStart: () => {
              toast.dismiss();
              toast.loading(t("pending"));
            },
            onSuccess: () => {
              toast.dismiss();
              toast.success(t("success"));
              setFormData({ name: "", email: "", password: "", confirmPassword: "" });
              router.push(`${localePrefix}/onboarding`);
            },
            onError: (error) => {
              toast.dismiss();
              const message = error?.error?.message || t("error");
              toast.error(message, { icon: <AlertCircle className="h-4 w-4" /> });
              setFormError(message);
            },
          },
        );
      });
    },
    [formData.confirmPassword, formData.password, localePrefix, passwordValidation.isValid, router, startTransition, t],
  );

  const requirements = useMemo(
    () => [
      { key: "length" as const, label: t("passwordRequirements.length") },
      { key: "lowercase" as const, label: t("passwordRequirements.lowercase") },
      { key: "uppercase" as const, label: t("passwordRequirements.uppercase") },
      { key: "number" as const, label: t("passwordRequirements.number") },
      { key: "special" as const, label: t("passwordRequirements.special") },
    ],
    [t],
  );

  const passwordsMatch = formData.password.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <CardContent className="mx-auto w-full max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 md:p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-balance text-muted-foreground">{t("subtitle")}</p>
            </div>

            {formError ? (
              <div
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{formError}</span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={(event) => handleInputChange("name", event.target.value)}
                disabled={isPending}
                placeholder={t("namePlaceholder")}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={(event) => handleInputChange("email", event.target.value)}
                disabled={isPending}
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(event) => handleInputChange("password", event.target.value)}
                onFocus={() => setShowPasswordHelp(true)}
                disabled={isPending}
                required
              />
              {showPasswordHelp && (
                <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium">{t("passwordRequirements.title")}</span>
                    {passwordValidation.isValid ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    {requirements.map(({ key, label }) => {
                      const passed = passwordValidation.checks[key];
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-2 ${passed ? "text-green-600" : "text-gray-500"}`}
                        >
                          {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(event) => handleInputChange("confirmPassword", event.target.value)}
                required
              />
              {passwordsMismatch && (
                <div className="mt-1 flex items-center gap-2 text-sm text-red-600">
                  <X className="h-3 w-3" />
                  <span>{t("passwordRequirements.mismatch")}</span>
                </div>
              )}
              {passwordsMatch && (
                <div className="mt-1 flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-3 w-3" />
                  <span>{t("passwordRequirements.match")}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                isPending ||
                !passwordValidation.isValid ||
                formData.password !== formData.confirmPassword
              }
            >
              {isPending ? t("pending") : t("submit")}
            </Button>

            <div className="text-center text-sm">
              {t("hasAccount")} {" "}
              <Link href={`/${locale}/signin`} className="underline underline-offset-4">
                {t("signinLink")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
