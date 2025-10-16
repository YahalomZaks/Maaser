'use client';

import { Bug, Lightbulb, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/shared/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";

type FeedbackType = "bug" | "feature";

const FeedbackPageClient = () => {
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
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleTypeSelect = (type: FeedbackType) => {
		setFeedbackType(type);
		setStep("form");
		setFormData((prev) => ({
			...prev,
			name: prev.name || session?.user?.name || "",
			email: prev.email || session?.user?.email || "",
		}));
	};

	useEffect(() => {
		if (session?.user) {
			setFormData((prev) => ({
				...prev,
				name: prev.name || session.user.name || "",
				email: prev.email || session.user.email || "",
			}));
		}
	}, [session?.user]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!feedbackType) {
			toast.error("בחרו סוג משוב (באג או פיצ׳ר)");
			return;
		}
		if (!formData.message.trim()) {
			toast.error("יש להזין תוכן הודעה");
			return;
		}

		try {
			setIsSubmitting(true);
			const res = await fetch("/api/feedback", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: feedbackType,
					name: formData.name,
					email: formData.email,
					message: formData.message,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: "Unknown error" }));
				throw new Error(err.error || "Failed to send feedback");
			}

			router.push(`/${locale}/feedback/success`);
		} catch (error) {
			console.error("Failed to send feedback", error);
			const msg = error instanceof Error ? error.message : "Unknown error";
			toast.error(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	const reset = () => {
		setStep("select");
		setFeedbackType(null);
		setFormData({
			name: session?.user?.name || "",
			email: session?.user?.email || "",
			message: "",
		});
	};

	return (
		<RequireAuth>
			<section className="content-page">
				<div className="container mx-auto max-w-2xl px-4 py-6">
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
									disabled={isSubmitting}
									value={formData.name}
									onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
									required
									placeholder={t("namePlaceholder")}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="email">{t("emailLabel")}</Label>
								<Input
									id="email"
									type="email"
									disabled={isSubmitting}
									value={formData.email}
									onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
									required
									placeholder={t("emailPlaceholder")}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="message">{t("messageLabel")}</Label>
								<textarea
									id="message"
									disabled={isSubmitting}
									value={formData.message}
									onChange={(event) => setFormData((prev) => ({ ...prev, message: event.target.value }))}
									required
									maxLength={1000}
									className="w-full min-h-32 p-3 border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
									placeholder={feedbackType === "bug" ? t("bugPlaceholder") : t("featurePlaceholder")}
								/>
								<div className="text-xs text-muted-foreground text-left">{formData.message.length}/1000</div>
							</div>

							<div className="flex gap-3 pt-2">
								<Button type="submit" className="flex-1" isLoading={isSubmitting} loadingText={t("submit") as string}>
									<Send className="h-4 w-4 mr-2" />
									{t("submit")}
								</Button>
								<Button type="button" variant="outline" onClick={reset}>
									{t("back")}
								</Button>
								<Link
									href={`/${locale}/dashboard`}
									className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm border hover:bg-muted"
								>
									{t("cancel")}
								</Link>
							</div>
						</form>
					)}
				</div>
			</section>
		</RequireAuth>
	);
};

export default FeedbackPageClient;
