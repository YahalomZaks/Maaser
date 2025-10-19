"use client";

import { useLocale, useTranslations } from "next-intl";
import React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface LanguageChangeModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LanguageChangeModal({ open, onConfirm, onCancel }: LanguageChangeModalProps) {
  const t = useTranslations("settings.language");
  const locale = useLocale();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-change-title"
      aria-describedby="language-change-description"
    >
      <Card className="w-full max-w-md gap-4" dir={locale.startsWith("he") ? "rtl" : "ltr"}>
        <CardHeader>
          <CardTitle id="language-change-title" className="text-xl">
            {t("changeConfirmTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p id="language-change-description" className="text-sm text-muted-foreground">
            {t("changeConfirmBody")}
          </p>
        </CardContent>
        <CardFooter className={`flex justify-end gap-2 ${locale.startsWith("he") ? "flex-row-reverse" : ""}`}>
          <Button variant="outline" onClick={onCancel} type="button">
            {t("changeConfirmCancel")}
          </Button>
          <Button onClick={onConfirm} type="button">
            {t("changeConfirmConfirm")}
          </Button>
        </CardFooter>
      </Card>
    </div>,
    document.body,
  );
}
