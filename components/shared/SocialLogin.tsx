"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

import { signIn } from "@/lib/auth-client";

import { Button } from "../ui/button";

const GOOGLE_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
export const isGoogleLoginEnabled = GOOGLE_ENABLED;
const TOAST_ID = "social-auth";

const GoogleIcon = ({ className }: { className?: string }) => (
	<svg
		className={className}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 48 48"
		role="img"
		aria-hidden
	>
		<path
			fill="#FFC107"
			d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12 0-6.627 5.373-12 12-12 3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24c0 11.045 8.955 20 20 20 11.045 0 20-8.955 20-20 0-1.341-.138-2.65-.389-3.917z"
		/>
		<path
			fill="#FF3D00"
			d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
		/>
		<path
			fill="#4CAF50"
			d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
		/>
		<path
			fill="#1976D2"
			d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
		/>
	</svg>
);

export function SocialLogin() {
	const tSocial = useTranslations("auth.social");
	const tSignin = useTranslations("auth.signin");
	const locale = useLocale();
	const router = useRouter();

	const handleGoogleLogin = useCallback(async () => {
		await signIn.social(
			{
				provider: "google",
				callbackURL: "/dashboard",
			},
			{
				onStart: () => {
					toast.loading(tSignin("loading"), { id: TOAST_ID });
				},
				onSuccess: async () => {
					let targetLocale = locale;
					try {
						const response = await fetch("/api/settings", { credentials: "include" });
						if (response.ok) {
							const data: { preferredLanguage?: string } | null = await response.json();
							if (data?.preferredLanguage === "he" || data?.preferredLanguage === "en") {
								targetLocale = data.preferredLanguage;
							}
						}
					} catch (error) {
						console.error("Failed to resolve preferred language after social login", error);
					}
					router.push(`/${targetLocale}/dashboard`);
					toast.dismiss(TOAST_ID);
					toast.success(tSignin("success"));
				},
				onError: (ctx) => {
					toast.dismiss(TOAST_ID);
					const message = ctx.error?.status === 403
						? tSignin("pleaseVerifyEmail")
						: ctx.error?.message ?? tSignin("error");
					toast.error(message);
				},
			},
		);
	}, [locale, router, tSignin]);

	if (!GOOGLE_ENABLED) {
		return null;
	}

	return (
		<div className="flex flex-col gap-3">
			<Button
				variant="outline"
				type="button"
				onClick={handleGoogleLogin}
				className="w-full cursor-pointer items-center justify-center gap-2"
				aria-label={tSocial("sr.google")}
			>
				<GoogleIcon className="h-5 w-5" />
				<span className="text-sm font-medium">{tSocial("buttons.google")}</span>
			</Button>
		</div>
	);
}

export default SocialLogin;
