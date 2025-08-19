import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("firebaseAuthToken")?.value
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Optionally, verify admin role using Firestore or custom claims
  if (isAdminRoute) {
    const user = await auth.verifyIdToken(token)
    if (user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}