'use client';

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

const TermsPageClient = () => {
	const t = useTranslations("terms");
	const locale = useLocale();
	const updated = new Date().toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<section className="content-page">
			<div className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
				<header className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight text-neutral-900">{t("title")}</h1>
					<p className="text-sm text-neutral-500">{t("updated", { date: updated })}</p>
					<p className="text-neutral-700">{t("intro")}</p>
				</header>

				<div className="space-y-6">
					{(
						[
							"acceptance",
							"service",
							"privacy",
							"cookies",
							"accounts",
							"acceptableUse",
							"intellectualProperty",
							"disclaimer",
							"limitation",
							"changes",
							"contact",
						] as const
					).map((key) => (
						<section key={key} className="space-y-2">
							<h2 className="text-xl font-semibold text-neutral-900">{t(`sections.${key}.title`)}</h2>
							<p className="text-neutral-700 leading-relaxed">{t(`sections.${key}.text`)}</p>
						</section>
					))}
				</div>

				<div className="flex items-center justify-between pt-4">
					<Link href={`/${locale}`} className="text-sm text-primary hover:underline">
						{t("cta")}
					</Link>
				</div>
			</div>
		</section>
	);
};

export default TermsPageClient;
