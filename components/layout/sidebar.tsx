"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Home, Activity, Gauge, CreditCard, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

function IconButton({
  children,
  label,
  href,
  isActive,
  onClick,
}: {
  children: React.ReactNode
  label: string
  href?: string
  isActive?: boolean
  onClick?: () => void
}) {
  const className = cn(
    "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 group relative",
    isActive
      ? "bg-primary text-primary-foreground shadow-medium scale-105"
      : "text-primary/70 hover:bg-primary/10 hover:text-primary hover:scale-105 shadow-soft",
  )

  const content = (
    <>
      {children}
      <span className="absolute left-full ml-3 px-2 py-1 bg-sidebar-foreground text-sidebar-background text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {label}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button onClick={onClick} aria-label={label} title={label} className={className}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href!} aria-label={label} title={label} className={className}>
      {content}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  const handleLogout = () => {
    // Use Firebase signOut
    import("@/lib/firebase").then(({ auth }) => {
      import("firebase/auth").then(({ signOut }) => {
        signOut(auth).then(() => {
          localStorage.removeItem("hasCompletedSetup")
          window.location.href = "/login"
        })
      })
    })
  }

  const getUserInitial = () => {
    // This will be handled by Firebase auth state
    return "U"
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-20 bg-sidebar-background border-r border-sidebar-border shadow-strong z-30 flex flex-col items-center py-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-medium hover:shadow-strong transition-all duration-200 hover:scale-105 overflow-hidden">
        <Image src="/logo.png" alt="NEXD.PM" width={32} height={32} className="object-contain" />
      </div>

      <nav className="mt-8 flex flex-col gap-4">
        <IconButton label="Workspace" href="/workspace" isActive={pathname === "/workspace"}>
          <LayoutGrid className="h-5 w-5" />
        </IconButton>
        <IconButton label="My Tasks" href="/my_tasks" isActive={pathname === "/my_tasks"}>
          <Home className="h-5 w-5" />
        </IconButton>
        <IconButton label="Activity" href="/activity" isActive={pathname === "/activity"}>
          <Activity className="h-5 w-5" />
        </IconButton>
        <IconButton label="Dashboard" href="/dashboard" isActive={pathname === "/dashboard"}>
          <Gauge className="h-5 w-5" />
        </IconButton>
        <IconButton label="Billing" href="/billing" isActive={pathname === "/billing"}>
          <CreditCard className="h-5 w-5" />
        </IconButton>
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        <IconButton label="Logout" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </IconButton>
        <div className="h-10 w-10 rounded-xl bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-sm font-semibold text-primary shadow-soft hover:shadow-medium transition-all duration-200 hover:scale-105 cursor-pointer">
          {getUserInitial()}
        </div>
      </div>
    </aside>
  )
}
