"use client";

import { createAuthClient } from "better-auth/react";

function getServerBaseURL() {
	const envUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		process.env.NEXTAUTH_URL ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

	const baseUrl = envUrl ?? "http://localhost:3000";

	return baseUrl.replace(/\/$/, "");
}

function resolveBaseURL() {
	if (typeof window !== "undefined") {
		return `${window.location.origin}/api/auth`;
	}

	return `${getServerBaseURL()}/api/auth`;
}

export const { signIn, signOut, signUp, useSession, sendVerificationEmail, forgetPassword, resetPassword } =
	createAuthClient({
		baseURL: resolveBaseURL(),
		fetchOptions: {
			credentials: "include",
		},
	});
