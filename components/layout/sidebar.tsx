"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Home, Activity, Gauge, CreditCard, LogOut, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useAuth } from "@/hooks/useAuth"

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
      ? "bg-[#4ab5ae] text-red shadow-medium scale-105"
      : "text-[#4ab5ae] hover:bg-[#4ab5ae] hover:text-white hover:scale-105 shadow-soft"
  )

  const content = (
    <>
      {children}
      <span className="absolute left-full ml-3 px-2 py-1 bg-white text-[#19222d] text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 group-hover:bg-[#4ab5ae] group-hover:text-white">
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
  const { logout } = useAuth() // <-- use the logout from the hook

  const handleLogout = async () => {
    try {
      await logout()
    } catch (err) {
      console.error("[Sidebar] Logout failed:", err)
    }
  }



  return (
    <aside className="fixed inset-y-0 left-0 w-20 bg-[#19222d] border-r border-gray-700 shadow-strong z-30 flex flex-col items-center justify-between py-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-transparent shadow-medium hover:shadow-strong transition-all duration-200 hover:scale-105 overflow-hidden">
        <Image src="/square_logo.jpg" alt="NEXD.PM" width={62} height={62} className="object-contain" />
      </div>

      <nav className="flex flex-col gap-4">
        <IconButton label="Workspace" href="/workspace" isActive={pathname === "/workspace"}>
          <LayoutGrid className={cn("h-5 w-5", pathname === "/workspace" ? "text-white" : "text-[#4ab5ae]")} />
        </IconButton>
        <IconButton label="My Tasks" href="/my_tasks" isActive={pathname === "/my_tasks"}>
          <Home className={cn("h-5 w-5", pathname === "/my_tasks" ? "text-white" : "text-[#4ab5ae]")} />
        </IconButton>
        
        {/* New Messaging Icon */}
        <IconButton label="Messaging" href="/messaging" isActive={pathname === "/messaging"}>
          <MessageSquare className={cn("h-5 w-5", pathname === "/messaging" ? "text-white" : "text-[#4ab5ae]")} />
        </IconButton>

        {/* <IconButton label="Activity" href="/activity" isActive={pathname === "/activity"}>
          <Activity className={cn("h-5 w-5", pathname === "/activity" ? "text-white" : "text-[#4ab5ae]")} />
        </IconButton>
        <IconButton label="Dashboard" href="/dashboard" isActive={pathname === "/dashboard"}>
          <Gauge className={cn("h-5 w-5", pathname === "/dashboard" ? "text-white" : "text-[#4ab5ae]")} />
        </IconButton> */}
        <IconButton label="Account" href="/account" isActive={pathname === "/account"}>
          <CreditCard className={cn("h-5 w-5", pathname === "/account" ? "text-white" : "text-[#4ab5ae]")} />
        </IconButton>
      </nav>

      <div className="flex flex-col items-center gap-4">
        <IconButton label="Logout" onClick={handleLogout}>
          <LogOut className="h-5 w-5 text-[#4ab5ae]" />
        </IconButton>
      </div>
    </aside>
  )
}