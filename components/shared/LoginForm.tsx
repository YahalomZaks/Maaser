"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendVerificationEmail, signIn } from "@/lib/auth-client";


export function LoginForm() {
	const t = useTranslations('auth.signin');
	const locale = useLocale();
	const [isPending, startTransition] = useTransition();
	const [show, setShow] = useState(false);
	const [email, setEmail] = useState("");
	const router = useRouter();

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		startTransition(async () => {
			await signIn.email(
				{
					email,
					password,
				},
				{
					onStart: () => {
						toast.loading(t('loading'));
					},
					onSuccess: () => {
						router.push(`/${locale}/dashboard`);
						toast.dismiss();
						toast.success(t('success'));
					},
					onError: (error) => {
						if (error.error.status === 403) {
							toast.error(error.error.message);
							setShow(true);
							return;
						}
						toast.dismiss();
						toast.error(t('error'));
					},
				},
			);
		});
	};

	const handleVerificatioEmail = async () => {
		await sendVerificationEmail(
			{
				email,
				callbackURL: `/${locale}/signin`,
			},
			{
				onError: (error) => {
					toast.error(error.error.message);
				},
				onSuccess: () => {
					toast.success(t('verificationEmailSent'));
				},
			},
		);
	};

	return (
		<div className="flex flex-col gap-6">
			<Card className="overflow-hidden">
				<CardContent className=" max-w-lg mx-auto w-full">
					<form className="md:p-8" onSubmit={handleSubmit}>
						<div className="flex flex-col gap-6">
							<div className="flex flex-col items-center text-center">
								<h1 className="text-2xl font-bold">{t('title')}</h1>
								<p className="text-balance text-muted-foreground">{t('subtitle')}</p>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="email">{t('email')}</Label>
								<Input
									id="email"
									type="email"
									disabled={isPending}
									onChange={(e) => {
										setEmail(e.target.value);
										setShow(false); // Reset show state on email change
									}}
									name="email"
									placeholder={t('emailPlaceholder')}
									required
								/>
							</div>
							<div className="grid gap-2">
								<div className="flex items-center">
									<Label htmlFor="password">{t('password')}</Label>
									<Link href={`/${locale}/forget-password`} className="ml-auto text-sm underline-offset-2 hover:underline">
										{t('forgotPassword')}
									</Link>
								</div>
								<Input id="password" disabled={isPending} type="password" name="password" required />
							</div>
							<Button type="submit" disabled={isPending} className="w-full cursor-pointer ">
								{t('submit')}
							</Button>
							<div className="relative my-2 text-center">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t border-border" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-background px-3 py-1 text-muted-foreground hover:text-primary transition-colors duration-200 cursor-pointer rounded-md hover:bg-accent">
										{t('orContinueWith')}
									</span>
								</div>
							</div>
							{/* Social login temporarily disabled */}
							{/* <SocialLogin /> */}
							<div className="text-center text-sm">
								{t('noAccount')}{" "}
								<Link href={`/${locale}/signup`} className="underline underline-offset-4">
									{t('signupLink')}
								</Link>
							</div>
							{show && (
								<Button onClick={handleVerificatioEmail} type="button" className="text-red-500 text-sm text-center">
									{t('pleaseVerifyEmail')}
								</Button>
							)}
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
