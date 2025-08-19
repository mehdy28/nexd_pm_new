"use client"

import type { ReactNode } from "react"
import "@/styles/identity.css"
import "@/styles/theme.css"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { TopbarProvider } from "./topbar-store"
import { LoadingOverlay } from "./loading-overlay"

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <TopbarProvider>
      <Sidebar />
      <Topbar />
      <div className="fixed left-20 right-0 top-20 bottom-0 bg-background overflow-hidden">
        <div className="h-full w-full overflow-auto bg-muted/30">{children}</div>
      </div>
      <LoadingOverlay />
    </TopbarProvider>
  )
}
