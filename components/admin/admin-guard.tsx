"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldX } from "lucide-react"
import { useAuth } from "@/hooks/useAuth" // <-- Changed import to useAuth

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  // Use useAuth hook
  const { currentUser, loading } = useAuth() 
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Check if the user is authenticated (currentUser is equivalent to 'user' from the old hook)
    if (!currentUser) {
      // Redirect to login if not authenticated
      router.push("/login")
      return
    }

    // Check if the authenticated user has the ADMIN role
    if (currentUser.role !== "ADMIN") {
      // Redirect away if they are logged in but not an Admin
      router.push("/workspace") // Changed from /dashboard to /workspace as per your preferred member destination
      return
    }
  }, [currentUser, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(174,70%,54%)]"></div>
      </div>
    )
  }

  // If not loading, check authorization explicitly before rendering children
  // This check serves as a fallback or a brief view before the useEffect redirect fires
  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <ShieldX className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 text-center">
              You don't have permission to access the admin dashboard. Please contact your administrator if you believe
              this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}