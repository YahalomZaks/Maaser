"use client";

import Lottie from "lottie-react";
import { useTranslations } from "next-intl";
import React from "react";

import loadingAnimation from "@/animation/loadingAnimation.json";

/**
 * Full-viewport clean loading screen with a centered Lottie animation and caption below.
 * - Uses lottie-react
 * - No borders or extra chrome, just neutral background inheriting from the app
 * - Caption text switches by locale (he/en)
 */
export default function LoadingScreen() {
  const t = useTranslations("common");
  const caption = t("pageLoading");

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center py-12">
      <div className="flex flex-col items-center justify-center gap-4">
        <Lottie
          animationData={loadingAnimation}
          loop
          autoplay
          style={{ width: 180, height: 180 }}
        />
        <p
          aria-live="polite"
          className="text-muted-foreground text-sm sm:text-base select-none"
        >
          {caption}
        </p>
      </div>
    </div>
  );
}
