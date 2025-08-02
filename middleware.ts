import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  try {
    // Simple route protection without session checking for now
    // We'll check authentication on the client side instead

    const protectedRoutes = [
      "/dashboard",
      "/income",
      "/donations",
      "/settings",
      "/admin",
    ];

    const isProtectedRoute = protectedRoutes.some((route) =>
      nextUrl.pathname.startsWith(route)
    );

    // For now, let all requests through
    // Authentication will be handled client-side with redirects
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
