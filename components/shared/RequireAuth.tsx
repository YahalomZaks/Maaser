"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/auth-client";

interface RequireAuthProps {
	children: ReactNode;
	fallback?: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
	const { data: session, isPending } = useSession();
	const router = useRouter();
	const locale = useLocale();

	useEffect(() => {
		if (!isPending && !session) {
			router.replace(`/${locale}`);
		}
	}, [isPending, session, router, locale]);

	if (isPending) {
		return (
			fallback ?? (
				<div className="flex min-h-[320px] items-center justify-center">
					<p className="text-sm text-muted-foreground">Loading…</p>
				</div>
			)
		);
	}

	if (!session) {
		return null;
	}

	return <>{children}</>;
}
