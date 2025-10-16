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
    // Rewrite localized favicon.ico (e.g., /he/favicon.ico) to the real favicon.png
    const { pathname } = req.nextUrl;
    if (pathname === "/favicon.ico") {
      const url = req.nextUrl.clone();
      url.pathname = "/favicon.png";
      return NextResponse.rewrite(url);
    }
    if (/^\/[a-zA-Z-]{2,}(?:\/[A-Z]{2})?\/favicon\.ico$/.test(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/favicon.png";
      return NextResponse.rewrite(url);
    }
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
     * - sitemap.xml (SEO sitemap)
     * - robots.txt (robots directives)
     */
    "/((?!api|_next/static|_next/image|favicon.png|sitemap.xml|robots.txt).*)",
  ],
};
