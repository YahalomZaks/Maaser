'use client';

import { useLocale, useTranslations } from "next-intl";

const FaqPageClient = () => {
	const t = useTranslations("faq");
	const locale = useLocale();

	return (
		<section className="content-page">
			<div className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
				<h1 className="text-3xl font-bold tracking-tight text-neutral-900">
					{t("title", { default: locale === "he" ? "שאלות ותשובות" : "FAQ" })}
				</h1>
				<p className="text-neutral-600">
					{t("intro", {
						default:
							locale === "he"
								? "ריכזנו עבורכם תשובות ברורות וקצרות לשאלות נפוצות על המערכת."
								: "Clear answers to common questions about the system.",
					})}
				</p>
				<div className="space-y-4">
					{[
						"pricing",
						"privacy",
						"howItWorks",
						"maaserCalc",
						"donationsTypes",
						"installments",
						"multiCurrency",
						"carryOver",
						"notifications",
						"account",
						"feedback",
					].map((key) => (
						<details key={key} className="rounded-lg border border-neutral-200 p-4">
							<summary className="cursor-pointer font-semibold text-neutral-900">{t(`items.${key}.q`)}</summary>
							<div className="mt-2 space-y-2 text-neutral-700">{t(`items.${key}.a`)}</div>
						</details>
					))}
				</div>
				<div className="pt-2">
					<a
						href={`/${locale}`}
						className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
					>
						{locale === "he" ? "חזרה לעמוד הראשי" : "Back to home"}
					</a>
				</div>
			</div>
		</section>
	);
};

export default FaqPageClient;
