import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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
     * - _next (all Next.js internal assets)
     * - _vercel (Vercel platform internals)
     * - Any path that looks like a static asset file (e.g. has an extension like .svg, .png, .css)
     * - favicon files and SEO files
     */
    "/((?!api|_next|_vercel|.*\\..*|favicon.ico|favicon.png|sitemap.xml|robots.txt).*)",
  ],
};
