"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { RequireAuth } from "@/components/shared/RequireAuth";

export default function FeedbackSuccessPage() {
  const t = useTranslations("feedback");
  const locale = useLocale();

  return (
    <RequireAuth>
      <section className="content-page">
      <div className="container mx-auto max-w-xl px-4 py-12 text-center">
        <CheckCircle className="h-14 w-14 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t("successTitle")}</h1>
        <p className="text-muted-foreground mb-8">{t("successSubtitle")}</p>
        <div className="flex items-center justify-center gap-3">
          <Link href={`/${locale}/dashboard`} className="welcome-btn welcome-btn-primary">
            {t("backHome")}
          </Link>
          <Link href={`/${locale}/feedback`} className="welcome-btn welcome-btn-secondary">
            {t("sendAnother")}
          </Link>
        </div>
      </div>
      </section>
    </RequireAuth>
  );
}
