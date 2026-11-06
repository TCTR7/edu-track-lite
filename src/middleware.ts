import { NextResponse, type NextRequest } from "next/server";
import {
  getHomeRouteForRole,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/jwt";

const PUBLIC_PATHS = ["/login", "/manifest.webmanifest", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    // Redirect logged-in user away from /login
    if (pathname === "/login") {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        const session = await verifySessionToken(token);
        if (session) {
          return NextResponse.redirect(
            new URL(getHomeRouteForRole(session.role), request.url)
          );
        }
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(getHomeRouteForRole(session.role), request.url)
    );
  }

  // Enforce high-level route namespaces
  if (pathname.startsWith("/operator") && session.role !== "OPERATOR") {
    return NextResponse.redirect(
      new URL(getHomeRouteForRole(session.role), request.url)
    );
  }

  if (pathname.startsWith("/portal") && session.role !== "STUDENT") {
    return NextResponse.redirect(
      new URL(getHomeRouteForRole(session.role), request.url)
    );
  }

  const isCenterArea =
    pathname.startsWith("/classes") ||
    pathname.startsWith("/tuition") ||
    pathname.startsWith("/students") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/management") ||
    pathname.startsWith("/account");

  if (
    isCenterArea &&
    session.role !== "ADMIN" &&
    session.role !== "TEACHER"
  ) {
    return NextResponse.redirect(
      new URL(getHomeRouteForRole(session.role), request.url)
    );
  }

  if (pathname.startsWith("/management") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/classes", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
