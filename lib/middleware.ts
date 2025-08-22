// import { NextRequest, NextResponse } from "next/server"
// import { auth } from "firebase-admin/auth"
// import { initializeApp, getApps, cert } from "firebase-admin/app"

// // Initialize Firebase Admin if not already initialized
// if (!getApps().length) {
//   initializeApp({
//     credential: cert({
//       projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//       privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//     }),
//   })
// }
// export async function middleware(request: NextRequest) {
//   const authHeader = request.headers.get("authorization")
//   const token = authHeader?.replace("Bearer ", "")
//   const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")

//   if (!token) {
//     return NextResponse.redirect(new URL("/login", request.url))
//   }

//   try {
//     const decodedToken = await auth.verifyIdToken(token)
    
//     if (isAdminRoute) {
//       const customClaims = decodedToken.customClaims || {}
//       if (customClaims.role !== "ADMIN") {
//         return NextResponse.redirect(new URL("/dashboard", request.url))
//       }
//     }
//   } catch (error) {
//     return NextResponse.redirect(new URL("/login", request.url))
//   }

//   return NextResponse.next()
// }




// lib/middleware.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function middleware(req: any) {
  // Skip authentication for public routes
  if (req.nextUrl.pathname.startsWith("/api/public")) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/protected")) {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (!token) {
        return new NextResponse(
          JSON.stringify({ message: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        const decodedToken = await getAuth().verifyIdToken(token);
        // You can add the decoded token to the request headers for use in your API routes
        req.decodedToken = decodedToken;
        return NextResponse.next();
      } catch (error) {
        console.error("Token verification error:", error);
        return new NextResponse(
          JSON.stringify({ message: "Authentication failed" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
  }
  return NextResponse.next()
}

// Specify which routes this middleware should apply to
export const config = {
  matcher: "/api/:path*", // Apply to all /api routes except those in /api/public
};