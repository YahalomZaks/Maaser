import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";

// import { sendEmailAction } from "@/actions/sendEmail.action."; // temporarily disabled
import { prismaClient } from "@/lib/prisma";

const prisma = prismaClient;

export const auth = betterAuth({
  appName: "SecureStart",
  secret: process.env.BETTER_AUTH_SECRET || "fallback_secret_for_development",
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc mongodb with your database
  }),
  user: {
    // Add custom fields to user object
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
      },
    },
  },
  // Add social providers only if we have the credentials
  ...((process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
  (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    ? {
        socialProviders: {
          ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
            ? {
                github: {
                  clientId: process.env.GITHUB_CLIENT_ID,
                  clientSecret: process.env.GITHUB_CLIENT_SECRET,
                },
              }
            : {}),
          ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? {
                google: {
                  clientId: process.env.GOOGLE_CLIENT_ID,
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  scope: ["openid", "profile", "email"],
                },
              }
            : {}),
        },
      }
    : {}),
  trustedOrigins: [
    "http://localhost:3000", // Fixed to match our dev server
    "https://authify.dev:3000",
    "https://securestart.netlify.app/",
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  advanced: {
    cookiePrefix: "SecureStart",
  },

  // emailVerification temporarily disabled - removing duplicate config

  emailAndPassword: {
    requireEmailVerification: false, // Temporarily disabled for basic setup
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
    // sendResetPassword temporarily disabled until we have email setup
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") {
        return;
      }
      const email = ctx.body?.email;
      const emailDomain = process.env.EMAIL_DOMAIN as string;
      // Skip domain check if EMAIL_DOMAIN is empty
      if (
        emailDomain &&
        !emailDomain.split(",").includes(email.split("@")[1])
      ) {
        throw new APIError("BAD_REQUEST", {
          message: "Email Domain not allowed",
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") {
        return;
      }
      // After user signs up, check if they should be admin
      const email = ctx.body?.email;
      const firstAdminEmail = process.env.FIRST_ADMIN_EMAIL;

      if (email && firstAdminEmail && email === firstAdminEmail) {
        // Update user role to admin
        try {
          await prisma.user.update({
            where: { email },
            data: { role: "ADMIN" },
          });
        } catch (error) {
          console.error("Error setting admin role:", error);
        }
      }
    }),
  },
});

export type ErrorCode = keyof typeof auth.$ERROR_CODES | "UNKNOWN";
