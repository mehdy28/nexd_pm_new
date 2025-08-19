"use client" // Added missing semicolon after use client directive

import type React from "react"
import { AppLayout } from "@/components/layout/app-layout"

export default function CoreLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
