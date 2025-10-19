"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/auth-client";

import LoadingScreen from "./LoadingScreen";

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
		return fallback ?? <LoadingScreen />;
	}

	if (!session) {
		return null;
	}

	return <>{children}</>;
}
