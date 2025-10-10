import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { locales } from "./i18n/request";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: "he",
  localePrefix: "always",
});

export async function middleware(req: NextRequest) {
  try {
    return intlMiddleware(req);
  } catch (error) {
    console.error("Middleware error:", error);
    return intlMiddleware(req);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.png (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.png).*)",
  ],
};
