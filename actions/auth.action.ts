"use server";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";

import { type ErrorCode, auth } from "@/lib/auth";

type ActionState =
  | {
      error?: string;
      success?: boolean;
      message?: string;
      redirectTo?: string;
    }
  | undefined;

export async function signUpAction(prevState: ActionState, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  console.log("Sign up attempt:", {
    email,
    name,
    passwordLength: password?.length,
  });

  if (password !== confirmPassword) {
    return {
      error: "Passwords do not match",
      success: false,
    };
  }
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
      headers: await headers(),
    });

    console.log("Sign up successful:", result);

    return {
      success: true,
      message: "Account created successfully.",
      redirectTo: "/onboarding",
    };
  } catch (err) {
    console.error("Sign up error:", err);

    if (err instanceof APIError) {
      const errCode = err.body ? (err.body.code as ErrorCode) : "UNKNOWN";

      switch (errCode) {
        case "USER_ALREADY_EXISTS":
          return {
            error: "User with this email already exists.",
            success: false,
          };
        default:
          return { error: err.message, success: false };
      }
    }
    return {
      success: false,
      error: `An unexpected error occurred during sign up: ${
        err instanceof Error ? err.message : "Unknown error"
      }`,
    };
  }
}
