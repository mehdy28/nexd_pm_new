import { NextRequest, NextResponse } from "next/server"
import { auth } from "firebase-admin/auth"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}
export async function middleware(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const decodedToken = await auth.verifyIdToken(token)
    
    if (isAdminRoute) {
      const customClaims = decodedToken.customClaims || {}
      if (customClaims.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }
  } catch (error) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}