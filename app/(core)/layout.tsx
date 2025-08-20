"use client"

import type React from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { useFirebaseAuth } from "@/lib/hooks/useFirebaseAuth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function CoreLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useFirebaseAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <AppLayout>{children}</AppLayout>
}
