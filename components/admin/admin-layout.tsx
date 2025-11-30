"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminSidebar } from "./admin-sidebar"
import { AdminTopbar } from "./admin-topbar"
import { LoadingOverlay } from "../layout/loading-overlay"
import { useAuthContext } from "@/lib/AuthContextProvider"
import { TopbarProvider } from "../layout/topbar-store"
import "@/styles/identity.css"
import "@/styles/theme.css"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auth context integration
  const { currentUser, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!currentUser && pathname !== "/admin-register") {
        // User is not authenticated, redirect to login
        console.log("[AdminLayout] No current user, redirecting to /login")
        router.push("/login")
      } else if (currentUser && currentUser.role !== "ADMIN") {
        // User is authenticated but is NOT an ADMIN, redirect them away
        console.log("[AdminLayout] Non-admin user detected, redirecting to core app.")
        // Assuming core app entry point is '/' or similar
        router.push("/")
      }
      // If user is ADMIN, they are allowed to stay.
    }
  }, [currentUser, loading, router, pathname])

  // Show loading overlay if authentication check is pending or if the user fails the role check.
  if (loading || (pathname !== "/admin-register" && !currentUser) || (currentUser && currentUser.role !== "ADMIN")) {
    return <LoadingOverlay />
  }

  // Render the core Admin layout wrapped in a div instead of Fragment.
  return (
    // <div className="min-h-screen">
    //   <AdminSidebar  />

    //   <AdminTopbar />

    //   {/* Main content area, positioned relative to the fixed sidebar and topbar */}
    //   <div className="fixed left-20 right-0 top-20 bottom-0 bg-background overflow-hidden">
    //     <div className="h-full w-full overflow-auto bg-muted/30">{children}</div>
    //   </div>

    //   <LoadingOverlay />
    // </div>

    <TopbarProvider>
      <AdminSidebar />

      {/* <AdminTopbar /> */}

      <div className="fixed left-20 right-0 top-0 bottom-0 bg-white overflow-hidden">
        <div className="h-full w-full overflow-auto bg-muted/30">{children}</div>
      </div>
      <LoadingOverlay /> {/* You might keep this for route-specific loadings,
                                 but the initial auth loading is handled above. */}
    </TopbarProvider>
  )
}