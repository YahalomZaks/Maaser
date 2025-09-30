"use client";

import { ChevronDown, Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types/finance";

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

type MonthItem = {
  id: string;
  monthIndex: number;
  incomesBase: number;
  donationsBase: number;
  obligation: number;
  runningBalance: number;
  convertedEntries?: number;
};

export function MobileYearlyMonthsList({
  months,
  currency,
  locale,
}: {
  months: MonthItem[];
  currency: CurrencyCode;
  locale: string;
}) {
  const t = useTranslations("dashboard");
  const tMonths = useTranslations("months");
  const sectionRef = useRef<HTMLElement | null>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number | null>(null);

  const recalc = useCallback(() => {
    if (!sectionRef.current) {
      return;
    }
    const rect = sectionRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;

    // Read CSS safe-area bottom (if available)
    const root = document.documentElement;
    const safeAreaVar = getComputedStyle(root).getPropertyValue("--safe-area-bottom").trim();
    const safeAreaPx = safeAreaVar.endsWith("px") ? Number(safeAreaVar.replace("px", "")) : 0;

    // Responsive gap: ~6% of viewport height, clamped between 20px and 64px, plus safe area
    const responsivePart = Math.round(viewportH * 0.06);
    const clamped = Math.max(20, Math.min(64, responsivePart));
    const bottomGap = clamped + (Number.isFinite(safeAreaPx) ? safeAreaPx : 0);

    const computed = Math.max(180, Math.floor(viewportH - rect.top - bottomGap));
    setListMaxHeight(computed);
  }, []);

  useEffect(() => {
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("orientationchange", recalc);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("orientationchange", recalc);
    };
  }, [recalc]);

  return (
  <section ref={sectionRef} className="relative mb-6 overflow-hidden rounded-xl border border-border/60 bg-white/70 shadow-sm backdrop-blur-sm">
      <header className="border-b border-border/60 px-4 py-3 text-center">
        <h3 className="text-sm font-semibold tracking-tight">{t("table.title")}</h3>
      </header>
      <div
        className="overflow-y-auto pr-1 pb-6"
        style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
      >
        <ul className="divide-y divide-border/60">
          {months.map((month) => (
            <li key={month.id} className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{tMonths(MONTH_KEYS[month.monthIndex])}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    month.runningBalance >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {formatCurrency(month.runningBalance, currency, locale)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="block text-muted-foreground">{t("table.columns.income")}</span>
                  <span className="font-medium">{formatCurrency(month.incomesBase, currency, locale)}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground">{t("table.columns.obligation")}</span>
                  <span className="font-medium">{formatCurrency(month.obligation, currency, locale)}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground">{t("table.columns.donations")}</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    {month.convertedEntries && month.convertedEntries > 0 ? <Coins className="h-3 w-3" /> : null}
                    {formatCurrency(month.donationsBase, currency, locale)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* Floating scroll-to-bottom button shown only when more content can be scrolled */}
      <ScrollToBottomButton scrollContainerRef={sectionRef} />
    </section>
  );
}

function ScrollToBottomButton({ scrollContainerRef }: { scrollContainerRef: React.RefObject<HTMLElement | null> }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const section = scrollContainerRef.current;
    if (!section) {
      return;
    }
    const scroller = section.querySelector(".overflow-y-auto") as HTMLDivElement | null;
    if (!scroller) {
      return;
    }

    const update = () => {
      const hasOverflow = scroller.scrollHeight > scroller.clientHeight + 2;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      setShow(hasOverflow && !atBottom);
    };

    // Run a few times to catch late layout/height adjustments
    const raf = requestAnimationFrame(update);
    const t = setTimeout(update, 60);

    const ro = new ResizeObserver(() => update());
    ro.observe(scroller);
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [scrollContainerRef]);

  const handleClick = () => {
    const section = scrollContainerRef.current;
    if (!section) {
      return;
    }
    const scroller = section.querySelector(".overflow-y-auto") as HTMLDivElement | null;
    if (!scroller) {
      return;
    }
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  };

  if (!show) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll to bottom"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-primary text-primary-foreground shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring/50"
    >
      <span className="sr-only">Scroll to bottom</span>
      <ChevronDown className="h-5 w-5 m-2" />
    </button>
  );
}

export default MobileYearlyMonthsList;
