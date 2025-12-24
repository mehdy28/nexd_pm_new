// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GUEST_ONLY_PAGES = ["/login", "/admin-register", "/register"];
const PUBLIC_ACCESSIBLE_PAGES = ["/forgot-password", "/blog", "/verify-email", "/check-email", "/reset-password" ,"/accept-invitation"];

const CORE_PATHS = [
  "/dashboard", "/account", "/activity", "/feed", "/guests", 
  "/guestsMessaging", "/home", "/messaging", "/my_tasks", 
  "/project", "/requests", "/account", "/wireframes", "/workspace"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- START FIX ---
  // Immediately bypass middleware for all blog pages, including the index and individual posts.
  if (pathname.startsWith('/blog')) {
    return NextResponse.next();
  }
  // --- END FIX ---

  const requestId = Math.random().toString(36).substring(7);

  // Skip internal and static files
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }


  const session = request.cookies.get("session")?.value;
  const userMetadata = request.cookies.get("user-metadata")?.value;


  let user = null;
  if (userMetadata) {
    try {
      user = JSON.parse(userMetadata);
    } catch (e) {
      user = null;
    }
  }

  const isGuestPage = GUEST_ONLY_PAGES.some(page => pathname.startsWith(page));
  const isPublicPage = pathname === "/" || PUBLIC_ACCESSIBLE_PAGES.some(page => pathname.startsWith(page));


  // 1. ANONYMOUS ACCESS
  if (!session) {
    if (!isGuestPage && !isPublicPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // 2. AUTHENTICATED ACCESS
  if (user) {
    // A. Email Verification Check
    if (!user.emailVerified && pathname !== "/check-email" && !pathname.startsWith("/verify-email") && pathname !== "/accept-invitation") {
      return NextResponse.redirect(new URL("/check-email", request.url));
    }

    // B. Prevent Verified Users from hitting Guest pages
    if (user.emailVerified && isGuestPage) {
      const dest = user.role === "ADMIN" ? "/admin-dashboard" : (user.hasWorkspace ? "/workspace" : "/setup");
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // C. Role & Workspace Protection
    if (user.role === "ADMIN") {
      if (CORE_PATHS.some(path => pathname.startsWith(path)) || pathname === "/setup") {
        return NextResponse.redirect(new URL("/admin-dashboard", request.url));
      }
    } else {
      // Member is logged in
      if (!user.hasWorkspace) {
        if (CORE_PATHS.some(path => pathname.startsWith(path))) {
          return NextResponse.redirect(new URL("/setup", request.url));
        }
      } else {
        if (pathname === "/setup") {
          return NextResponse.redirect(new URL("/workspace", request.url));
        }
      }
      
      // Members cannot access Admin pages
      if (pathname.startsWith("/admin-") || pathname.startsWith("/users") || pathname.startsWith("/model-profiles")) {
        return NextResponse.redirect(new URL("/workspace", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};