// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GUEST_ONLY_PAGES = ["/login", "/admin-register", "/register"];
const PUBLIC_ACCESSIBLE_PAGES = ["/forgot-password", "/blog", "/verify-email", "/check-email", "reset-password"];

const CORE_PATHS = [
  "/dashboard", "/billing", "/activity", "/feed", "/guests", 
  "/guestsMessaging", "/home", "/messaging", "/my_tasks", 
  "/project", "/requests", "/settings", "/wireframes", "/workspace"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = Math.random().toString(36).substring(7);

  // Skip internal and static files
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  console.log(`[Middleware][${requestId}] --- New Request ---`);
  console.log(`[Middleware][${requestId}] Path: ${pathname}`);

  const session = request.cookies.get("session")?.value;
  const userMetadata = request.cookies.get("user-metadata")?.value;

  console.log(`[Middleware][${requestId}] Session Cookie: ${session ? "EXISTS" : "MISSING"}`);

  let user = null;
  if (userMetadata) {
    try {
      user = JSON.parse(userMetadata);
      console.log(`[Middleware][${requestId}] User Metadata:`, user);
    } catch (e) {
      console.error(`[Middleware][${requestId}] Failed to parse user-metadata`);
      user = null;
    }
  }

  const isGuestPage = GUEST_ONLY_PAGES.some(page => pathname.startsWith(page));
  const isPublicPage = pathname === "/" || PUBLIC_ACCESSIBLE_PAGES.some(page => pathname.startsWith(page));

  console.log(`[Middleware][${requestId}] isGuestPage: ${isGuestPage} | isPublicPage: ${isPublicPage}`);

  // 1. ANONYMOUS ACCESS
  if (!session) {
    if (!isGuestPage && !isPublicPage) {
      console.log(`[Middleware][${requestId}] ACTION: No session + Private route -> Redirecting to /login`);
      return NextResponse.redirect(new URL("/login", request.url));
    }
    console.log(`[Middleware][${requestId}] ACTION: Anonymous allowed. Proceeding.`);
    return NextResponse.next();
  }

  // 2. AUTHENTICATED ACCESS
  if (user) {
    // A. Email Verification Check
    if (!user.emailVerified && pathname !== "/check-email" && !pathname.startsWith("/verify-email")) {
      console.log(`[Middleware][${requestId}] ACTION: Email NOT verified -> Redirecting to /check-email`);
      return NextResponse.redirect(new URL("/check-email", request.url));
    }

    // B. Prevent Verified Users from hitting Guest pages
    if (user.emailVerified && isGuestPage) {
      const dest = user.role === "ADMIN" ? "/admin-dashboard" : (user.hasWorkspace ? "/workspace" : "/setup");
      console.log(`[Middleware][${requestId}] ACTION: Verified user on Guest page -> Redirecting to ${dest}`);
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // C. Role & Workspace Protection
    if (user.role === "ADMIN") {
      if (CORE_PATHS.some(path => pathname.startsWith(path)) || pathname === "/setup") {
        console.log(`[Middleware][${requestId}] ACTION: Admin accessing Member route -> Redirecting to /admin-dashboard`);
        return NextResponse.redirect(new URL("/admin-dashboard", request.url));
      }
    } else {
      // Member is logged in
      if (!user.hasWorkspace) {
        if (CORE_PATHS.some(path => pathname.startsWith(path))) {
          console.log(`[Middleware][${requestId}] ACTION: Member no workspace -> Redirecting to /setup`);
          return NextResponse.redirect(new URL("/setup", request.url));
        }
      } else {
        if (pathname === "/setup") {
          console.log(`[Middleware][${requestId}] ACTION: Member with workspace on /setup -> Redirecting to /workspace`);
          return NextResponse.redirect(new URL("/workspace", request.url));
        }
      }
      
      // Members cannot access Admin pages
      if (pathname.startsWith("/admin-") || pathname.startsWith("/users") || pathname.startsWith("/model-profiles")) {
        console.log(`[Middleware][${requestId}] ACTION: Member accessing Admin route -> Redirecting to /workspace`);
        return NextResponse.redirect(new URL("/workspace", request.url));
      }
    }
  }

  console.log(`[Middleware][${requestId}] ACTION: All checks passed. Proceeding.`);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};