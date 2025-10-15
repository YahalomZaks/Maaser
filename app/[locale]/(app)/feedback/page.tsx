"use client";

import { Bug, Lightbulb, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/shared/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";

type FeedbackType = "bug" | "feature";

export default function FeedbackPage() {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();

  const [step, setStep] = useState<"select" | "form">("select");
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    message: "",
  });

  const handleTypeSelect = (type: FeedbackType) => {
    setFeedbackType(type);
    setStep("form");
    // Prefill from session on step entry if fields are empty
    setFormData((prev) => ({
      ...prev,
      name: prev.name || session?.user?.name || "",
      email: prev.email || session?.user?.email || "",
    }));
  };

  // Hydrate defaults once when session loads, but don't overwrite user edits
  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || session.user.name || "",
        email: prev.email || session.user.email || "",
      }));
    }
  }, [session?.user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: hook up to API in the future
    console.warn("Feedback submitted:", { type: feedbackType, ...formData });
    router.push(`/${locale}/feedback/success`);
  };

  const reset = () => {
    setStep("select");
    setFeedbackType(null);
    setFormData({ name: session?.user?.name || "", email: session?.user?.email || "", message: "" });
  };

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>

        {step === "select" && (
          <div className="space-y-4">
            <p className="text-muted-foreground mb-4">{t("selectPrompt")}</p>

            <Button onClick={() => handleTypeSelect("bug")} variant="outline" className="w-full h-16 flex items-center gap-4 text-right">
              <Bug className="h-6 w-6 text-red-500" />
              <div className="text-right">
                <div className="font-semibold">{t("bugTitle")}</div>
                <div className="text-sm text-muted-foreground">{t("bugSubtitle")}</div>
              </div>
            </Button>

            <Button onClick={() => handleTypeSelect("feature")} variant="outline" className="w-full h-16 flex items-center gap-4 text-right">
              <Lightbulb className="h-6 w-6 text-yellow-500" />
              <div className="text-right">
                <div className="font-semibold">{t("featureTitle")}</div>
                <div className="text-sm text-muted-foreground">{t("featureSubtitle")}</div>
              </div>
            </Button>

            <div className="mt-4">
              <Link href={`/${locale}/dashboard`} className="text-sm text-muted-foreground hover:underline">
                {t("backToDashboard")}
              </Link>
            </div>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("nameLabel")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                placeholder={t("namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
                placeholder={t("emailPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{t("messageLabel")}</Label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                required
                maxLength={1000}
                className="w-full min-h-32 p-3 border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={feedbackType === "bug" ? t("bugPlaceholder") : t("featurePlaceholder")}
              />
              <div className="text-xs text-muted-foreground text-left">{formData.message.length}/1000</div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                {t("submit")}
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                {t("back")}
              </Button>
              <Link href={`/${locale}/dashboard`} className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm border hover:bg-muted">
                {t("cancel")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </RequireAuth>
  );
}
